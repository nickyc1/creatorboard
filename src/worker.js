const AUTH_COOKIE_NAME = "creatorboard_session";
const AUTH_CODE_TTL_SECONDS = 10 * 60;
const AUTH_SESSION_TTL_SECONDS = 12 * 60 * 60;
const MAX_THREAD_LIMIT = 500;
const THREAD_PAGE_SIZE = 50;
const MAX_MESSAGE_LIMIT = 1000;
const MAX_PAGES = 10;
const MESSAGE_PAGE_SIZE = 50;
const MAX_SEND_MESSAGE_BYTES = 2000;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/api/session") {
        return json({
          authRequired: authRequired(env),
          authenticated: Boolean(await currentSession(request, env)),
        });
      }
      if (request.method === "POST" && url.pathname === "/api/auth/request-code") return requestLoginCode(request, env);
      if (request.method === "POST" && url.pathname === "/api/auth/verify-code") return verifyLoginCode(request, env);
      if (request.method === "POST" && url.pathname === "/api/auth/logout") return logout();
      if (request.method === "GET" && url.pathname === "/api/instagram/status") {
        const auth = await requireAuth(request, env);
        if (auth) return auth;
        return json({
          configured: Boolean(env.META_IG_ACCOUNT_ID && env.META_ACCESS_TOKEN),
          graphVersion: graphVersion(env),
          graphBase: graphBase(env),
          accountIdPresent: Boolean(env.META_IG_ACCOUNT_ID),
          tokenPresent: Boolean(env.META_ACCESS_TOKEN),
        });
      }
      if (request.method === "POST" && url.pathname === "/api/instagram/sync") {
        const auth = await requireAuth(request, env);
        if (auth) return auth;
        return syncInstagram(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/instagram/send") {
        const auth = await requireAuth(request, env);
        if (auth) return auth;
        return sendInstagramMessage(request, env);
      }
      if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "method_not_allowed" }, 405);
      if (url.pathname === "/app") return redirect("/app.html");
      if (url.pathname === "/login") return redirect("/login.html");
      if (authRequired(env) && url.pathname === "/app.html" && !(await currentSession(request, env))) {
        return redirect("/login.html");
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ error: "server_error", message: safeError(error, env) }, 500);
    }
  },
};

async function syncInstagram(request, env) {
  if (!env.META_IG_ACCOUNT_ID || !env.META_ACCESS_TOKEN) {
    return json({
      error: "instagram_not_configured",
      message: "Set META_IG_ACCOUNT_ID and META_ACCESS_TOKEN in Cloudflare secrets.",
    }, 400);
  }

  const body = await readJson(request);
  const limit = clamp(Number(body.limit || 50), 1, MAX_THREAD_LIMIT);
  const requestedMessageLimit = Number(body.messageLimit);
  const messageLimit = clamp(Number.isFinite(requestedMessageLimit) ? requestedMessageLimit : 100, 0, MAX_MESSAGE_LIMIT);
  const maxPages = clamp(Number(body.maxPages || MAX_PAGES), 1, MAX_PAGES);
  const graphUrl = new URL(`${graphBase(env)}/${graphVersion(env)}/${encodeURIComponent(env.META_IG_ACCOUNT_ID)}/conversations`);
  graphUrl.searchParams.set("platform", "instagram");
  graphUrl.searchParams.set("limit", String(Math.min(THREAD_PAGE_SIZE, limit)));
  graphUrl.searchParams.set("fields", "id,updated_time,participants,messages.limit(1){id,message,created_time,from,to,attachments}");

  const conversations = [];
  let nextUrl = graphUrl.toString();
  let pagesFetched = 0;
  while (nextUrl && pagesFetched < maxPages && conversations.length < limit) {
    const response = await fetch(nextUrl, { headers: { Authorization: `Bearer ${env.META_ACCESS_TOKEN}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return metaError(response, payload);
    const pageData = Array.isArray(payload.data) ? payload.data : [];
    conversations.push(...pageData);
    nextUrl = payload.paging?.next || "";
    pagesFetched += 1;
    if (!pageData.length) nextUrl = "";
  }
  conversations.length = Math.min(conversations.length, limit);

  const profiles = await fetchParticipantProfiles(conversations, env);
  const messageMap = await fetchConversationMessages(conversations, messageLimit || MAX_MESSAGE_LIMIT, env);
  const normalizedConversations = conversations
    .map((conversation) => normalizeConversation(conversation, profiles, messageMap, env))
    .filter((conversation) => conversation.messages.length > 0);

  return json({
    syncedAt: new Date().toISOString(),
    count: normalizedConversations.length,
    totalConversations: conversations.length,
    pagesFetched,
    exhausted: !nextUrl,
    messageLimit: messageLimit || "all",
    conversations: normalizedConversations,
  });
}

async function sendInstagramMessage(request, env) {
  if (!env.META_IG_ACCOUNT_ID || !env.META_ACCESS_TOKEN) {
    return json({
      error: "instagram_not_configured",
      message: "Set META_IG_ACCOUNT_ID and META_ACCESS_TOKEN in Cloudflare secrets.",
    }, 400);
  }
  const body = await readJson(request);
  const recipientId = String(body.recipientId || "").trim();
  const message = String(body.message || "").trim();
  if (!/^\d{5,32}$/.test(recipientId)) return json({ error: "invalid_recipient", message: "Select a synced Instagram conversation before replying." }, 400);
  if (!message || new TextEncoder().encode(message).length > MAX_SEND_MESSAGE_BYTES) {
    return json({ error: "invalid_message", message: "Message must be 1-2000 bytes." }, 400);
  }

  const response = await fetch(`${graphBase(env)}/${graphVersion(env)}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return metaError(response, payload);
  return json({
    sentAt: new Date().toISOString(),
    recipientId: payload.recipient_id || recipientId,
    messageId: payload.message_id || "",
  });
}

async function fetchParticipantProfiles(conversations, env) {
  const ids = [...new Set(conversations.flatMap((conversation) => {
    const participants = conversation.participants?.data || [];
    return participants
      .filter((person) => person?.id && String(person.id) !== String(env.META_IG_ACCOUNT_ID))
      .map((person) => String(person.id));
  }))];
  const profiles = new Map();
  for (let i = 0; i < ids.length; i += 8) {
    const batch = await Promise.all(ids.slice(i, i + 8).map((id) => fetchParticipantProfile(id, env)));
    batch.filter(Boolean).forEach((profile) => profiles.set(String(profile.id), profile));
  }
  return profiles;
}

async function fetchConversationMessages(conversations, messageLimit, env) {
  const messageMap = new Map();
  for (let i = 0; i < conversations.length; i += 4) {
    const batch = await Promise.all(conversations.slice(i, i + 4).map(async (conversation) => {
      if (!conversation?.id) return null;
      const messages = await fetchConversationMessagePage(conversation.id, messageLimit, env);
      return messages.length ? [String(conversation.id), messages] : null;
    }));
    batch.filter(Boolean).forEach(([id, messages]) => messageMap.set(id, messages));
  }
  return messageMap;
}

async function fetchConversationMessagePage(conversationId, messageLimit, env) {
  const messages = [];
  let nextUrl = new URL(`${graphBase(env)}/${graphVersion(env)}/${encodeURIComponent(conversationId)}/messages`);
  nextUrl.searchParams.set("limit", String(Math.min(MESSAGE_PAGE_SIZE, messageLimit)));
  nextUrl.searchParams.set("fields", "id,message,created_time,from,to,attachments");

  while (nextUrl && messages.length < messageLimit) {
    const response = await fetch(nextUrl, { headers: { Authorization: `Bearer ${env.META_ACCESS_TOKEN}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return messages;
    const pageData = Array.isArray(payload.data) ? payload.data : [];
    messages.push(...pageData);
    nextUrl = payload.paging?.next ? new URL(payload.paging.next) : null;
    if (!pageData.length) nextUrl = null;
  }
  return messages.slice(0, messageLimit);
}

async function fetchParticipantProfile(id, env) {
  try {
    const graphUrl = new URL(`${graphBase(env)}/${graphVersion(env)}/${encodeURIComponent(id)}`);
    graphUrl.searchParams.set("fields", "id,name,username,follower_count,is_verified_user");
    const response = await fetch(graphUrl, { headers: { Authorization: `Bearer ${env.META_ACCESS_TOKEN}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return null;
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

function normalizeConversation(conversation, profiles = new Map(), messageMap = new Map(), env) {
  const participants = conversation.participants?.data || [];
  const creator = participants.find((person) => String(person.id) !== String(env.META_IG_ACCOUNT_ID)) || participants[0] || {};
  const profile = creator.id ? profiles.get(String(creator.id)) || {} : {};
  const messages = (messageMap.get(String(conversation.id)) || conversation.messages?.data || [])
    .map((message) => normalizeMessage(message, env))
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

function normalizeMessage(message, env) {
  return {
    id: message.id || "",
    message: message.message || attachmentSummary(message),
    createdTime: message.created_time || "",
    direction: message.from && String(message.from.id) === String(env.META_IG_ACCOUNT_ID) ? "outbound" : "inbound",
    from: message.from || {},
    to: message.to || {},
  };
}

async function requestLoginCode(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  if (!isAllowedEmail(email, env)) {
    return json({ ok: true, message: "If that email is approved for CreatorBoard, a login code will be sent." });
  }
  if (authRequired(env) && !env.RESEND_API_KEY) {
    return json({ error: "email_not_configured", message: "CreatorBoard email login is not configured yet." }, 500);
  }
  const code = await loginCodeForEmail(email, env);
  const sent = await sendLoginEmail(email, code, env);
  return json({
    ok: true,
    devCode: sent || authRequired(env) ? undefined : code,
    message: sent ? "Check your email for a six-digit CreatorBoard login code." : "Email is not configured in this environment. Use the development code shown here.",
  });
}

async function verifyLoginCode(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").replace(/\D/g, "");
  if (!isAllowedEmail(email, env) || !(await isValidLoginCode(email, code, env))) {
    return json({ error: "invalid_code", message: "That login code is invalid or expired." }, 400);
  }
  const expiresAt = Math.floor(Date.now() / 1000) + AUTH_SESSION_TTL_SECONDS;
  const session = await signedValue(`${email}|${expiresAt}`, env);
  return json({ ok: true, email }, 200, {
    "Set-Cookie": `${AUTH_COOKIE_NAME}=${encodeURIComponent(session)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${AUTH_SESSION_TTL_SECONDS}; Secure`,
  });
}

function logout() {
  return json({ ok: true }, 200, {
    "Set-Cookie": `${AUTH_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure`,
  });
}

async function requireAuth(request, env) {
  if (!authRequired(env) || await currentSession(request, env)) return null;
  return json({ error: "unauthorized", message: "Log in to CreatorBoard first." }, 401);
}

async function currentSession(request, env) {
  if (!authRequired(env)) return { email: "local@creatorboard.dev" };
  const session = parseCookies(request.headers.get("Cookie") || "")[AUTH_COOKIE_NAME];
  if (!session) return null;
  const unsigned = await verifySignedValue(decodeURIComponent(session), env);
  if (!unsigned) return null;
  const [email, expiresAt] = unsigned.split("|");
  if (!email || Number(expiresAt) < Math.floor(Date.now() / 1000)) return null;
  return { email };
}

async function loginCodeForEmail(email, env) {
  const bucket = Math.floor(Date.now() / 1000 / AUTH_CODE_TTL_SECONDS);
  return codeFromBucket(email, bucket, env);
}

async function isValidLoginCode(email, code, env) {
  const bucket = Math.floor(Date.now() / 1000 / AUTH_CODE_TTL_SECONDS);
  const current = await codeFromBucket(email, bucket, env);
  const previous = await codeFromBucket(email, bucket - 1, env);
  return code === current || code === previous;
}

async function codeFromBucket(email, bucket, env) {
  const digest = await hmacHex(`${email}:${bucket}`, env.AUTH_COOKIE_SECRET);
  return String(parseInt(digest.slice(0, 8), 16) % 1000000).padStart(6, "0");
}

async function signedValue(value, env) {
  return `${value}|${await hmacHex(value, env.AUTH_COOKIE_SECRET)}`;
}

async function verifySignedValue(value, env) {
  const parts = String(value || "").split("|");
  if (parts.length < 3) return "";
  const signature = parts.pop();
  const unsigned = parts.join("|");
  return signature === await hmacHex(unsigned, env.AUTH_COOKIE_SECRET) ? unsigned : "";
}

async function hmacHex(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret || "dev-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sendLoginEmail(email, code, env) {
  if (!env.RESEND_API_KEY) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM || "CreatorBoard <login@creatorboard.io>",
      to: email,
      subject: "Your CreatorBoard login code",
      text: `Your CreatorBoard login code is ${code}. It expires in 10 minutes.`,
    }),
  });
  return response.ok;
}

function isAllowedEmail(email, env) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const emails = splitEnv(env.AUTH_ALLOWED_EMAILS || "nick@raxdigital.com");
  const domains = splitEnv(env.AUTH_ALLOWED_DOMAINS || "");
  return emails.includes(email) || domains.includes(email.split("@")[1]);
}

function authRequired(env) {
  return env.AUTH_REQUIRED !== "false";
}

function graphVersion(env) {
  return env.META_GRAPH_VERSION || "v25.0";
}

function graphBase(env) {
  return env.INSTAGRAM_GRAPH_BASE || "https://graph.instagram.com";
}

async function readJson(request) {
  return request.json().catch(() => ({}));
}

function parseCookies(header) {
  return Object.fromEntries(header.split(";").map((item) => item.trim()).filter(Boolean).map((item) => {
    const index = item.indexOf("=");
    return index < 0 ? [item, ""] : [item.slice(0, index), item.slice(index + 1)];
  }));
}

function splitEnv(value) {
  return String(value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function attachmentSummary(message) {
  const count = message.attachments?.data?.length || 0;
  return count ? `[${count} attachment${count === 1 ? "" : "s"}]` : "";
}

function metaError(response, payload) {
  return json({
    error: "meta_graph_error",
    message: payload?.error?.message || "Meta Graph API request failed.",
    type: payload?.error?.type,
    code: payload?.error?.code,
  }, response.status);
}

function safeError(error, env) {
  return String(error?.message || error || "Unknown error").replace(env.META_ACCESS_TOKEN || "", "[redacted]");
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}
