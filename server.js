const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

loadDotEnv();

const PORT = Number(process.env.PORT || 8765);
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const INSTAGRAM_GRAPH_BASE = process.env.INSTAGRAM_GRAPH_BASE || "https://graph.instagram.com";
const IG_ACCOUNT_ID = process.env.META_IG_ACCOUNT_ID || "";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === "true";
const AUTH_ALLOWED_EMAILS = splitEnv(process.env.AUTH_ALLOWED_EMAILS || "nick@raxdigital.com");
const AUTH_ALLOWED_DOMAINS = splitEnv(process.env.AUTH_ALLOWED_DOMAINS || "");
const AUTH_COOKIE_NAME = "creatorboard_session";
const AUTH_COOKIE_SECRET = process.env.AUTH_COOKIE_SECRET || crypto.randomBytes(32).toString("hex");
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const AUTH_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAX_THREAD_LIMIT = 500;
const THREAD_PAGE_SIZE = 50;
const MAX_MESSAGE_LIMIT = 1000;
const MAX_PAGES = 10;
const MESSAGE_PAGE_SIZE = 50;
const MAX_SEND_MESSAGE_BYTES = 2000;
const loginCodes = new Map();
const sessions = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/api/session") {
      return sendJson(res, 200, { authRequired: AUTH_REQUIRED, authenticated: Boolean(currentSession(req)) });
    }
    if (req.method === "POST" && url.pathname === "/api/auth/request-code") {
      return requestLoginCode(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/auth/verify-code") {
      return verifyLoginCode(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      return logout(req, res);
    }
    if (req.method === "GET" && url.pathname === "/api/instagram/status") {
      if (!requireAuth(req, res)) return;
      return sendJson(res, 200, {
        configured: Boolean(IG_ACCOUNT_ID && ACCESS_TOKEN),
        graphVersion: GRAPH_VERSION,
        graphBase: INSTAGRAM_GRAPH_BASE,
        accountIdPresent: Boolean(IG_ACCOUNT_ID),
        tokenPresent: Boolean(ACCESS_TOKEN),
      });
    }
    if (req.method === "POST" && url.pathname === "/api/instagram/sync") {
      if (!requireAuth(req, res)) return;
      return syncInstagram(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/instagram/send") {
      if (!requireAuth(req, res)) return;
      return sendInstagramMessage(req, res);
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "method_not_allowed" });
    }
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    return sendJson(res, 500, { error: "server_error", message: safeError(error) });
  }
});

server.listen(PORT, () => {
  console.log(`CreatorBoard running at http://localhost:${PORT}/app.html`);
});

async function syncInstagram(req, res) {
  if (!IG_ACCOUNT_ID || !ACCESS_TOKEN) {
    return sendJson(res, 400, {
      error: "instagram_not_configured",
      message: "Set META_IG_ACCOUNT_ID and META_ACCESS_TOKEN in your environment or .env file.",
    });
  }
  const body = await readJsonBody(req, 16 * 1024);
  const limit = clamp(Number(body.limit || 50), 1, MAX_THREAD_LIMIT);
  const requestedMessageLimit = Number(body.messageLimit);
  const messageLimit = clamp(Number.isFinite(requestedMessageLimit) ? requestedMessageLimit : 100, 0, MAX_MESSAGE_LIMIT);
  const maxPages = clamp(Number(body.maxPages || MAX_PAGES), 1, MAX_PAGES);
  const graphUrl = new URL(`${INSTAGRAM_GRAPH_BASE}/${GRAPH_VERSION}/${encodeURIComponent(IG_ACCOUNT_ID)}/conversations`);
  graphUrl.searchParams.set("platform", "instagram");
  graphUrl.searchParams.set("limit", String(Math.min(THREAD_PAGE_SIZE, limit)));
  graphUrl.searchParams.set("fields", "id,updated_time,participants,messages.limit(1){id,message,created_time,from,to,attachments}");

  const conversations = [];
  let nextUrl = graphUrl.toString();
  let pagesFetched = 0;
  while (nextUrl && pagesFetched < maxPages && conversations.length < limit) {
    const graphResponse = await fetch(nextUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    const payload = await graphResponse.json().catch(() => ({}));
    if (!graphResponse.ok) {
      return sendJson(res, graphResponse.status, {
        error: "meta_graph_error",
        message: payload?.error?.message || "Meta Graph API request failed.",
        type: payload?.error?.type,
        code: payload?.error?.code,
      });
    }
    const pageData = Array.isArray(payload.data) ? payload.data : [];
    conversations.push(...pageData);
    nextUrl = payload.paging?.next || "";
    pagesFetched += 1;
    if (pageData.length === 0) nextUrl = "";
  }
  conversations.length = Math.min(conversations.length, limit);

  const profiles = await fetchParticipantProfiles(conversations);
  const messageMap = await fetchConversationMessages(conversations, messageLimit || MAX_MESSAGE_LIMIT);
  const normalizedConversations = conversations
    .map((conversation) => normalizeConversation(conversation, profiles, messageMap))
    .filter((conversation) => conversation.messages.length > 0);

  return sendJson(res, 200, {
    syncedAt: new Date().toISOString(),
    count: normalizedConversations.length,
    totalConversations: conversations.length,
    pagesFetched,
    exhausted: !nextUrl,
    messageLimit: messageLimit || "all",
    conversations: normalizedConversations,
  });
}

async function sendInstagramMessage(req, res) {
  if (!IG_ACCOUNT_ID || !ACCESS_TOKEN) {
    return sendJson(res, 400, {
      error: "instagram_not_configured",
      message: "Set META_IG_ACCOUNT_ID and META_ACCESS_TOKEN in your environment or .env file.",
    });
  }
  const body = await readJsonBody(req, 16 * 1024);
  const recipientId = String(body.recipientId || "").trim();
  const message = String(body.message || "").trim();
  if (!/^\d{5,32}$/.test(recipientId)) {
    return sendJson(res, 400, { error: "invalid_recipient", message: "Select a synced Instagram conversation before replying." });
  }
  if (!message || Buffer.byteLength(message, "utf8") > MAX_SEND_MESSAGE_BYTES) {
    return sendJson(res, 400, { error: "invalid_message", message: "Message must be 1-2000 bytes." });
  }

  const graphUrl = new URL(`${INSTAGRAM_GRAPH_BASE}/${GRAPH_VERSION}/me/messages`);
  const graphResponse = await fetch(graphUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });
  const payload = await graphResponse.json().catch(() => ({}));
  if (!graphResponse.ok) {
    return sendJson(res, graphResponse.status, {
      error: "meta_graph_error",
      message: payload?.error?.message || "Meta Graph API send failed.",
      type: payload?.error?.type,
      code: payload?.error?.code,
    });
  }
  return sendJson(res, 200, {
    sentAt: new Date().toISOString(),
    recipientId: payload.recipient_id || recipientId,
    messageId: payload.message_id || "",
  });
}

async function requestLoginCode(req, res) {
  const body = await readJsonBody(req, 16 * 1024);
  const email = normalizeEmail(body.email);
  if (!isAllowedEmail(email)) {
    await sleep(250);
    return sendJson(res, 200, {
      ok: true,
      message: "If that email is approved for CreatorBoard, a login code will be sent.",
    });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  loginCodes.set(email, {
    hash: hashCode(email, code),
    expiresAt: Date.now() + AUTH_CODE_TTL_MS,
    attempts: 0,
  });
  const sent = await sendLoginEmail(email, code);
  if (AUTH_REQUIRED && !sent) {
    loginCodes.delete(email);
    return sendJson(res, 500, {
      error: "email_not_configured",
      message: "CreatorBoard email login is not configured yet.",
    });
  }
  return sendJson(res, 200, {
    ok: true,
    devCode: sent || AUTH_REQUIRED ? undefined : code,
    message: sent
      ? "Check your email for a six-digit CreatorBoard login code."
      : "Email is not configured in this environment. Use the development code shown here.",
  });
}

async function verifyLoginCode(req, res) {
  const body = await readJsonBody(req, 16 * 1024);
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").replace(/\D/g, "");
  const record = loginCodes.get(email);
  if (!record || record.expiresAt < Date.now() || record.attempts >= 5) {
    loginCodes.delete(email);
    return sendJson(res, 400, { error: "invalid_code", message: "That login code is invalid or expired." });
  }

  record.attempts += 1;
  const expected = Buffer.from(record.hash);
  const received = Buffer.from(hashCode(email, code));
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return sendJson(res, 400, { error: "invalid_code", message: "That login code is invalid or expired." });
  }

  loginCodes.delete(email);
  const sessionId = crypto.randomBytes(32).toString("base64url");
  sessions.set(sessionId, {
    email,
    expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
  });
  res.setHeader("Set-Cookie", sessionCookie(sessionId, req));
  return sendJson(res, 200, { ok: true, email });
}

function logout(req, res) {
  const sessionId = parseCookies(req)[AUTH_COOKIE_NAME];
  if (sessionId) sessions.delete(sessionId);
  res.setHeader("Set-Cookie", `${AUTH_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return sendJson(res, 200, { ok: true });
}

async function fetchParticipantProfiles(conversations) {
  const ids = [...new Set(conversations.flatMap((conversation) => {
    const participants = conversation.participants?.data || [];
    return participants
      .filter((person) => person?.id && String(person.id) !== String(IG_ACCOUNT_ID))
      .map((person) => String(person.id));
  }))];
  const profiles = new Map();
  const concurrency = 6;
  let cursor = 0;

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor];
      cursor += 1;
      const profile = await fetchParticipantProfile(id);
      if (profile) profiles.set(id, profile);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  return profiles;
}

async function fetchConversationMessages(conversations, messageLimit) {
  const messageMap = new Map();
  const concurrency = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < conversations.length) {
      const conversation = conversations[cursor];
      cursor += 1;
      if (!conversation?.id) continue;
      const messages = await fetchConversationMessagePage(conversation.id, messageLimit);
      if (messages.length) messageMap.set(String(conversation.id), messages);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, conversations.length) }, worker));
  return messageMap;
}

async function fetchConversationMessagePage(conversationId, messageLimit) {
  const messages = [];
  let nextUrl = new URL(`${INSTAGRAM_GRAPH_BASE}/${GRAPH_VERSION}/${encodeURIComponent(conversationId)}/messages`);
  nextUrl.searchParams.set("limit", String(Math.min(MESSAGE_PAGE_SIZE, messageLimit)));
  nextUrl.searchParams.set("fields", "id,message,created_time,from,to,attachments");

  while (nextUrl && messages.length < messageLimit) {
    try {
      const graphResponse = await fetch(nextUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        signal: AbortSignal.timeout(10000),
      });
      const payload = await graphResponse.json().catch(() => ({}));
      if (!graphResponse.ok) return messages;
      const pageData = Array.isArray(payload.data) ? payload.data : [];
      messages.push(...pageData);
      nextUrl = payload.paging?.next ? new URL(payload.paging.next) : null;
      if (pageData.length === 0) nextUrl = null;
    } catch {
      return messages;
    }
  }

  return messages.slice(0, messageLimit);
}

async function fetchParticipantProfile(id) {
  try {
    const graphUrl = new URL(`${INSTAGRAM_GRAPH_BASE}/${GRAPH_VERSION}/${encodeURIComponent(id)}`);
    graphUrl.searchParams.set("fields", "id,name,username,follower_count,is_verified_user");
    const graphResponse = await fetch(graphUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    const payload = await graphResponse.json().catch(() => ({}));
    if (!graphResponse.ok) return null;
    return {
      id: payload.id || id,
      name: payload.name || "",
      username: payload.username || "",
      followerCount: Number.isFinite(Number(payload.follower_count)) ? Number(payload.follower_count) : null,
      isVerified: Boolean(payload.is_verified_user),
    };
  } catch {
    return null;
  }
}

function normalizeConversation(conversation, profiles = new Map(), messageMap = new Map()) {
  const participants = conversation.participants?.data || [];
  const creator = participants.find((person) => String(person.id) !== String(IG_ACCOUNT_ID)) || participants[0] || {};
  const profile = creator.id ? profiles.get(String(creator.id)) || {} : {};
  const messages = (messageMap.get(String(conversation.id)) || conversation.messages?.data || [])
    .map(normalizeMessage)
    .filter((message) => message.message);
  const latest = messages[0] || {};
  return {
    source: "instagram",
    conversationId: conversation.id,
    updatedTime: conversation.updated_time || latest.createdTime || "",
    identity: profile.username ? `@${profile.username}` : creator.username ? `@${creator.username}` : profile.name || creator.name || creator.id || conversation.id,
    participant: {
      id: creator.id || "",
      username: profile.username || creator.username || "",
      name: profile.name || creator.name || "",
      followerCount: profile.followerCount ?? null,
      isVerified: Boolean(profile.isVerified),
    },
    latestMessage: {
      id: latest.id || "",
      message: latest.message || "",
      createdTime: latest.createdTime || conversation.updated_time || "",
      direction: latest.direction || "inbound",
      from: latest.from || {},
      to: latest.to || {},
    },
    messages,
  };
}

function normalizeMessage(message) {
  return {
    id: message.id || "",
    message: message.message || attachmentSummary(message),
    createdTime: message.created_time || "",
    direction: message.from && String(message.from.id) === String(IG_ACCOUNT_ID) ? "outbound" : "inbound",
    from: message.from || {},
    to: message.to || {},
  };
}

function attachmentSummary(message) {
  const count = message.attachments?.data?.length || 0;
  return count ? `[${count} attachment${count === 1 ? "" : "s"}]` : "";
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  if (safePath === "/app") return redirect(res, "/app.html");
  if (safePath === "/login") return serveStatic(req, res, "/login.html");
  if (AUTH_REQUIRED && safePath === "/app.html" && !currentSession(req)) {
    return redirect(res, "/login.html");
  }
  let absolute = path.resolve(__dirname, `.${safePath}`);
  if (!isInsideRoot(absolute)) return sendJson(res, 403, { error: "forbidden" });
  if (hasHiddenSegment(absolute)) return sendJson(res, 404, { error: "not_found" });
  if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
    absolute = path.join(absolute, "index.html");
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    const indexRoute = path.resolve(__dirname, `.${safePath}/index.html`);
    if (!isInsideRoot(indexRoute) || hasHiddenSegment(indexRoute) || !fs.existsSync(indexRoute) || !fs.statSync(indexRoute).isFile()) {
      return sendJson(res, 404, { error: "not_found" });
    }
    absolute = indexRoute;
  }
  res.writeHead(200, { "Content-Type": mimeTypes[path.extname(absolute)] || "application/octet-stream" });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(absolute).pipe(res);
}

function requireAuth(req, res) {
  if (!AUTH_REQUIRED || currentSession(req)) return true;
  sendJson(res, 401, { error: "unauthorized", message: "Log in to CreatorBoard first." });
  return false;
}

function currentSession(req) {
  if (!AUTH_REQUIRED) return { email: "local@creatorboard.dev" };
  const sessionId = parseCookies(req)[AUTH_COOKIE_NAME];
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

function sessionCookie(sessionId, req) {
  const secure = isHttps(req) ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(AUTH_SESSION_TTL_MS / 1000)}${secure}`;
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const index = item.indexOf("=");
      return index < 0 ? [item, ""] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
    }));
}

function isHttps(req) {
  return req.headers["x-forwarded-proto"] === "https" || req.socket.encrypted;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function splitEnv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domain = email.split("@")[1];
  return AUTH_ALLOWED_EMAILS.includes(email) || AUTH_ALLOWED_DOMAINS.includes(domain);
}

function hashCode(email, code) {
  return crypto
    .createHmac("sha256", AUTH_COOKIE_SECRET)
    .update(`${email}:${code}`)
    .digest("hex");
}

async function sendLoginEmail(email, code) {
  if (!RESEND_API_KEY) {
    console.log(`CreatorBoard login code for ${email}: ${code}`);
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM || "CreatorBoard <login@creatorboard.io>",
      to: email,
      subject: "Your CreatorBoard login code",
      text: `Your CreatorBoard login code is ${code}. It expires in 10 minutes.`,
    }),
  });
  return response.ok;
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInsideRoot(absolutePath) {
  return absolutePath === __dirname || absolutePath.startsWith(`${__dirname}${path.sep}`);
}

function hasHiddenSegment(absolutePath) {
  return path.relative(__dirname, absolutePath).split(path.sep).some((segment) => segment.startsWith("."));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function safeError(error) {
  return String(error?.message || error || "Unknown error").replace(ACCESS_TOKEN, "[redacted]");
}

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
