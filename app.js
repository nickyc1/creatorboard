const STORE_KEY = "creatorboard.v2";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 1500;

const statuses = [
  ["needs-reply", "Needs response"],
  ["content-review", "Content to review"],
  ["payment-question", "Payment question"],
  ["team-action", "Team task"],
  ["waiting-creator", "Waiting on creator"],
  ["ready-run", "Ready to run"],
  ["active-ad", "Active ad"],
  ["done", "No action needed"],
  ["paused", "Not working"],
];

const views = [
  ["attention", "Needs action"],
  ["needs-reply", "Replies"],
  ["content-review", "Content"],
  ["payment-question", "Payment"],
  ["team-action", "Team action"],
  ["waiting-creator", "Waiting"],
  ["new", "New"],
  ["done", "Done"],
  ["all", "All"],
];

const actionStatuses = new Set(["needs-reply", "content-review", "payment-question", "team-action"]);
const owners = ["Unassigned", "Ben", "Maddie", "Jake", "Support"];
const PAGE_SIZE = 50;

let state = loadState();
let selectedId = state.creators[0]?.id || "";
let currentView = "attention";
let currentPage = 1;
let currentSort = { key: "last", direction: "desc" };

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightedHtml(value, query = searchQuery()) {
  const text = String(value ?? "");
  if (!query) return escapeHtml(text);
  const pattern = new RegExp(`(${escapeRegExp(query)})`, "ig");
  return escapeHtml(text).replace(pattern, "<mark>$1</mark>");
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]/g, "");
}

function searchQuery() {
  return $("searchInput")?.value.trim() || "";
}

function formatCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Intl.NumberFormat("en", {
    notation: number >= 10000 ? "compact" : "standard",
    maximumFractionDigits: number >= 10000 ? 1 : 0,
  }).format(number);
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    if (Array.isArray(saved.creators) && Array.isArray(saved.dms)) return saved;
  } catch {}
  return { creators: [], dms: [], unmatched: [] };
}

function sanitizeLoadedState() {
  state.creators.forEach((creator) => {
    creator.dms = (creator.dms || []).filter((dm) => String(dm.message || "").trim());
  });
  removeEmptyInstagramDmRows();
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((items) => items.some((item) => item.trim()));
}

function rowsToObjects(rows) {
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1, MAX_ROWS + 1).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = (row[index] || "").trim();
    });
    return object;
  });
}

function val(row, names) {
  for (const name of names) {
    const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (key && row[key]) return row[key].trim();
  }
  return "";
}

function blankCreator(identity) {
  const handle = identity?.startsWith("@") ? identity : "";
  return {
    id: makeId("creator"),
    name: handle ? handle.slice(1) : identity || "New creator",
    handle,
    owner: "Unassigned",
    status: "needs-reply",
    nextStep: "Review latest DM and decide the next step.",
    suggestedReply: "",
    checklist: {},
    dms: [],
    spend: {},
    rosterState: "New inbound",
    source: "Instagram DM",
  };
}

function creatorFromRow(row, source) {
  const name = val(row, ["Creator Name", "Name"]);
  const handle = val(row, ["Instagram Handle", "Handle"]);
  if (!name && !handle) return null;
  const existing = findCreator(handle || name);
  const base = existing || {
    id: makeId("creator"),
    owner: "Unassigned",
    status: "team-action",
    nextStep: "Review imported creator and set the next step.",
    suggestedReply: "",
    checklist: {},
    dms: [],
    spend: {},
  };
  return {
    ...base,
    name: name || base.name || handle,
    handle: handle || base.handle || "",
    niche: val(row, ["Niche"]) || base.niche || "",
    fbFollowers: val(row, ["FB Follower Count"]) || base.fbFollowers || "",
    igFollowers: val(row, ["IG Follower Count"]) || base.igFollowers || "",
    engagement: val(row, ["Engagement %"]) || base.engagement || "",
    avgLikes: val(row, ["Avg. Likes"]) || base.avgLikes || "",
    baseFee: val(row, ["Base Fee"]) || base.baseFee || "",
    code: val(row, ["Code"]) || base.code || "",
    size: val(row, ["Shirt Size", "Size"]) || base.size || "",
    paypal: val(row, ["PayPal Email"]) || base.paypal || "",
    contactEmail: val(row, ["Contact Email"]) || base.contactEmail || "",
    phone: val(row, ["Phone Number"]) || base.phone || "",
    shipping: val(row, ["Shipping Address"]) || base.shipping || "",
    sheetStatus: val(row, ["Status"]) || base.sheetStatus || "",
    rosterState: val(row, ["Status"]) === "1" ? "In sheet: active" : base.rosterState || "In sheet: review",
    source,
    checklist: {
      shipping: Boolean(val(row, ["Shipping Address"]) || base.checklist?.shipping),
      paypal: Boolean(val(row, ["PayPal Email"]) || base.checklist?.paypal),
      assets: Boolean(base.checklist?.assets),
      access: Boolean(base.checklist?.access),
      paid: Boolean(base.checklist?.paid),
    },
  };
}

function applySpendRow(row, source) {
  const name = val(row, ["Creator Name", "Name"]);
  const creator = findCreator(name);
  if (!creator) return false;
  const key = source.toLowerCase().includes("yt") || source.toLowerCase().includes("youtube") ? "youtube" : "meta";
  creator.spend[key] = {
    month: val(row, ["Month"]),
    spend: val(row, ["Total Amount Spent"]),
    owed: val(row, ["Total Amount Owed"]),
    roas: val(row, ["AVG. ROAS"]),
    impressions: val(row, ["Total Impressions"]),
    purchases: val(row, ["Total Purchases"]),
    paid: val(row, ["Paid"]),
  };
  if ((creator.spend[key].owed || "$0") !== "$0" && creator.spend[key].paid !== "TRUE") {
    creator.status = "payment-question";
    creator.nextStep ||= "Review unpaid creator balance.";
  }
  return true;
}

function findCreator(identity) {
  const needle = normalize(identity);
  if (!needle) return null;
  return state.creators.find((creator) => {
    return normalize(creator.handle) === needle
      || normalize(creator.name) === needle
      || normalize(creator.instagramUsername) === needle
      || normalize(creator.handle).includes(needle)
      || normalize(creator.name).includes(needle);
  }) || null;
}

function upsertCreator(creator) {
  const index = state.creators.findIndex((item) => item.id === creator.id || (creator.handle && normalize(item.handle) === normalize(creator.handle)));
  if (index >= 0) state.creators[index] = { ...state.creators[index], ...creator };
  else state.creators.push(creator);
}

function hasDm(sourceId) {
  if (!sourceId) return false;
  return state.dms.some((dm) => dm.sourceId === sourceId)
    || state.creators.some((creator) => creator.dms?.some((dm) => dm.sourceId === sourceId));
}

function upsertThreadCreator({ identity, conversationId = "", participantId = "", username = "", followerCount = null, isVerified = false }) {
  let creator = findCreator(identity) || findCreator(username);
  if (!creator) {
    creator = blankCreator(identity || username);
    upsertCreator(creator);
  }
  creator.instagramConversationId = conversationId || creator.instagramConversationId || "";
  creator.instagramParticipantId = participantId || creator.instagramParticipantId || "";
  creator.instagramUsername = username || creator.instagramUsername || "";
  if (Number.isFinite(Number(followerCount))) creator.igFollowers = formatCount(Number(followerCount));
  creator.instagramFollowerCount = Number.isFinite(Number(followerCount)) ? Number(followerCount) : creator.instagramFollowerCount;
  creator.instagramVerified = Boolean(isVerified) || Boolean(creator.instagramVerified);
  if (!creator.handle && username) creator.handle = `@${username}`;
  creator.rosterState ||= "New inbound";
  creator.source ||= "Instagram DM";
  return creator;
}

function addDm({ identity, message, direction = "inbound", time = "now", sourceId = "", conversationId = "", participantId = "", username = "" }) {
  const trimmedIdentity = String(identity || "").trim();
  const trimmedMessage = String(message || "").trim();
  if (!trimmedIdentity || !trimmedMessage) return null;
  if (sourceId && hasDm(sourceId)) return null;
  const creator = upsertThreadCreator({ identity: trimmedIdentity, conversationId, participantId, username });
  const dm = {
    id: makeId("dm"),
    sourceId,
    conversationId,
    participantId,
    username,
    creatorId: creator.id,
    identity: trimmedIdentity.slice(0, 120),
    message: trimmedMessage.slice(0, 1200),
    direction: direction === "outbound" ? "outbound" : "inbound",
    time: String(time || "now").slice(0, 40) || "now",
    createdAt: new Date().toISOString(),
  };
  creator.dms = creator.dms || [];
  creator.dms.unshift(dm);
  state.dms.unshift(dm);
  applyDmInference(creator, dm);
  selectedId ||= creator.id;
  return creator;
}

function addInstagramConversation(conversation) {
  if (!conversation.messages?.length) return;
  const followerCount = conversation.participant?.followerCount;
  upsertThreadCreator({
    identity: conversation.identity,
    conversationId: conversation.conversationId || "",
    participantId: conversation.participant?.id || "",
    username: conversation.participant?.username || "",
    followerCount,
    isVerified: conversation.participant?.isVerified,
  });
  const messages = [...(conversation.messages || [])].reverse();
  const importable = messages.length ? messages : [conversation.latestMessage || {}];
  importable.forEach((message) => {
    if (!conversation.identity || !message?.message) return;
    addDm({
      identity: conversation.identity,
      message: message.message,
      direction: message.direction || "inbound",
      time: formatTime(message.createdTime || conversation.updatedTime),
      sourceId: message.id || "",
      conversationId: conversation.conversationId || "",
      participantId: conversation.participant?.id || "",
      username: conversation.participant?.username || "",
    });
  });
}

function removeEmptyInstagramDmRows() {
  const beforeIds = new Set(state.creators.map((creator) => creator.id));
  state.creators = state.creators.filter((creator) => {
    const hasMessages = (creator.dms || []).some((dm) => String(dm.message || "").trim());
    const fromInstagramOnly = creator.source === "Instagram DM" || creator.instagramConversationId || creator.instagramParticipantId;
    return hasMessages || !fromInstagramOnly;
  });
  const afterIds = new Set(state.creators.map((creator) => creator.id));
  state.dms = state.dms.filter((dm) => afterIds.has(dm.creatorId) && String(dm.message || "").trim());
  if (selectedId && beforeIds.has(selectedId) && !afterIds.has(selectedId)) selectedId = state.creators[0]?.id || "";
}

function keywordMatch(text, words) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function applyDmInference(creator, dm) {
  if (["done", "paused"].includes(creator.status) && dm.direction === "outbound") return;
  const text = dm.message.toLowerCase();
  if (dm.direction === "outbound") {
    creator.status = "waiting-creator";
    creator.nextStep = "Waiting on creator reply.";
    creator.suggestedReply = "";
    return;
  }
  if (keywordMatch(text, ["pay", "paid", "paypal", "payout", "commission", "owed", "invoice", "money"])) {
    creator.status = "payment-question";
    creator.nextStep = "Answer payment question and confirm payout status.";
    creator.suggestedReply = "Totally, I can check that for you. Send over the best PayPal email and I will confirm the payout status on our side.";
  } else if (keywordMatch(text, ["upload", "uploaded", "video", "videos", "content", "drive", "folder", "attachment", "file", "raw"])) {
    creator.status = "content-review";
    creator.nextStep = "Review uploaded content, then send edit or approval update.";
    creator.suggestedReply = "Got it, thanks for sending this over. We will review the content and let you know if we need any tweaks before editing.";
  } else if (keywordMatch(text, ["address", "shipping", "shirt", "size", "gear", "package"])) {
    creator.status = "team-action";
    creator.nextStep = "Collect or confirm shipping details and shirt size.";
    creator.suggestedReply = "Perfect. Can you send your shipping address and shirt size here? Once we have that, we can get the gear moving.";
  } else if (keywordMatch(text, ["access", "permission", "authorize", "partnership", "ad code", "partner"])) {
    creator.status = "team-action";
    creator.nextStep = "Help creator complete partnership ad access.";
    creator.suggestedReply = "Thanks. I am checking the partnership access now. If anything is missing, I will send the exact step to approve it.";
  } else if (keywordMatch(text, ["not interested", "pass", "no thanks", "stop", "remove"])) {
    creator.status = "paused";
    creator.nextStep = "Mark as not working and remove from active follow-up.";
    creator.suggestedReply = "No worries, thanks for letting us know. We will close this out on our side.";
  } else if (keywordMatch(text, ["interested", "sounds good", "yes", "sure", "down", "let's do", "lets do"])) {
    creator.status = "needs-reply";
    creator.nextStep = "Send onboarding details and collect address, size, PayPal, and partnership access.";
    creator.suggestedReply = "Awesome. Next step is getting your gear sent out and setting up partnership access. Can you send your address, shirt size, and PayPal email?";
  } else {
    creator.status = "needs-reply";
    creator.nextStep = "Reply to latest creator DM.";
    creator.suggestedReply = "Thanks for the note. I am checking this now and will get you the next step shortly.";
  }
}

function importDmObjects(rows) {
  rows.forEach((row) => {
    addDm({
      identity: val(row, ["handle", "instagram handle", "name", "creator", "creator name"]),
      message: val(row, ["message", "last message", "text", "dm"]),
      direction: val(row, ["direction", "type"]) || "inbound",
      time: val(row, ["time", "last touch", "date"]) || "now",
    });
  });
}

async function readFile(file) {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is over 2MB. Split it before importing.`);
  return file.text();
}

async function importCreatorFiles(files) {
  for (const file of files) {
    const text = await readFile(file);
    const rows = rowsToObjects(parseCsv(text));
    rows.map((row) => creatorFromRow(row, file.name)).filter(Boolean).forEach(upsertCreator);
  }
  if (!selectedId && state.creators[0]) selectedId = state.creators[0].id;
  saveState();
  render();
}

async function importSpendFiles(files) {
  for (const file of files) {
    const text = await readFile(file);
    const rows = rowsToObjects(parseCsv(text));
    rows.forEach((row) => applySpendRow(row, file.name));
  }
  saveState();
  render();
}

function selectedCreator() {
  return state.creators.find((creator) => creator.id === selectedId);
}

function statusLabel(status) {
  return statuses.find(([value]) => value === status)?.[1] || "Needs reply";
}

function formatTime(value) {
  if (!value) return "now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 40);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function timeWeight(value) {
  const match = String(value || "").match(/^(\d+)(m|h|d|w)$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === "m") return amount;
  if (unit === "h") return amount * 60;
  if (unit === "d") return amount * 1440;
  return amount * 10080;
}

function initials(name) {
  return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function latestDm(creator) {
  return creator.dms?.[0] || null;
}

function isNewCreator(creator) {
  return !creator.sheetStatus && !creator.code && (creator.rosterState || "").toLowerCase().includes("new");
}

function actionScore(creator) {
  const statusScore = {
    "payment-question": 0,
    "content-review": 1,
    "needs-reply": 2,
    "team-action": 3,
    "waiting-creator": 6,
    "ready-run": 7,
    "active-ad": 8,
    done: 9,
    paused: 10,
  }[creator.status] ?? 5;
  return statusScore * 100000 - timeWeight(latestDm(creator)?.time);
}

function sortValue(creator, key) {
  const last = latestDm(creator);
  if (key === "creator") return normalize(creator.name || creator.handle);
  if (key === "status") return statusLabel(creator.status);
  if (key === "owner") return creator.owner || "Unassigned";
  if (key === "last") return timeWeight(last?.time);
  if (key === "next") return normalize(creator.nextStep || "");
  return actionScore(creator);
}

function compareCreators(a, b) {
  if (currentSort.key === "action") return actionScore(a) - actionScore(b);
  const aValue = sortValue(a, currentSort.key);
  const bValue = sortValue(b, currentSort.key);
  const direction = currentSort.direction === "asc" ? 1 : -1;
  if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
  return String(aValue).localeCompare(String(bValue)) * direction;
}

function creatorMatchesView(creator) {
  if (currentView === "all") return true;
  if (currentView === "attention") return actionStatuses.has(creator.status);
  if (currentView === "new") return isNewCreator(creator);
  return creator.status === currentView;
}

function filteredCreators() {
  const query = normalize(searchQuery());
  const queue = $("queueFilter").value;
  const owner = $("ownerFilter").value;
  return state.creators
    .filter((creator) => {
      const text = creatorSearchText(creator);
      return (query || creatorMatchesView(creator))
        && (!query || text.includes(query))
        && (queue === "all" || creator.status === queue)
        && (owner === "all" || creator.owner === owner);
    })
    .sort(compareCreators);
}

function creatorSearchText(creator) {
  const messages = (creator.dms || []).map((dm) => dm.message).join(" ");
  return normalize([
    creator.name,
    creator.handle,
    creator.instagramUsername,
    creator.code,
    creator.nextStep,
    creator.niche,
    creator.igFollowers,
    messages,
  ].join(" "));
}

function matchedDm(creator) {
  const query = normalize(searchQuery());
  if (!query) return latestDm(creator);
  return (creator.dms || []).find((dm) => normalize(dm.message).includes(query)) || latestDm(creator);
}

function dashboardSummary() {
  const needsReply = state.creators.filter((creator) => creator.status === "needs-reply").length;
  const content = state.creators.filter((creator) => creator.status === "content-review").length;
  const payment = state.creators.filter((creator) => creator.status === "payment-question").length;
  const team = state.creators.filter((creator) => creator.status === "team-action").length;
  const waiting = state.creators.filter((creator) => creator.status === "waiting-creator").length;
  const action = needsReply + content + payment + team;
  if (!state.creators.length) return "Sync Instagram DMs to build the action inbox.";
  return `${action} need team action: ${needsReply} replies, ${content} content/edit checks, ${payment} payment questions, ${team} team tasks. ${waiting} are waiting on creators.`;
}

function renderMetrics() {
  const metricRows = [
    ["Needs action", state.creators.filter((creator) => actionStatuses.has(creator.status)).length],
    ["Replies", state.creators.filter((creator) => creator.status === "needs-reply").length],
    ["Content/edit", state.creators.filter((creator) => creator.status === "content-review").length],
    ["Payment", state.creators.filter((creator) => creator.status === "payment-question").length],
    ["New creators", state.creators.filter(isNewCreator).length],
  ];
  $("metrics").innerHTML = metricRows.map(([label, value]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
}

async function refreshInstagramStatus() {
  const status = $("instagramStatus");
  if (location.protocol === "file:") {
    status.textContent = "Open through the local connector: node server.js";
    return;
  }
  try {
    const response = await fetch("/api/instagram/status", { cache: "no-store" });
    const data = await response.json();
    status.textContent = data.configured
      ? `Connected to Meta Graph ${data.graphVersion}.`
      : "Connector running, but Meta env vars are not set.";
  } catch {
    status.textContent = "Connector is not running. Start it with node server.js.";
  }
}

async function syncInstagram() {
  const status = $("instagramStatus");
  if (location.protocol === "file:") {
    status.textContent = "Start the connector with node server.js, then open http://localhost:8765/app.html";
    return;
  }
  const limit = Number($("instagramLimit").value || 25);
  const rawMessageLimit = $("instagramMessageLimit").value;
  const messageLimit = rawMessageLimit === "" ? 100 : Number(rawMessageLimit);
  status.textContent = "Syncing Instagram DMs...";
  $("syncInstagramButton").disabled = true;
  try {
    const response = await fetch("/api/instagram/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit, messageLimit }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Instagram sync failed.");
    removeEmptyInstagramDmRows();
    data.conversations.forEach(addInstagramConversation);
    const skipped = Number(data.totalConversations || data.count) - Number(data.count || 0);
    status.textContent = `Synced ${data.count} Instagram thread${data.count === 1 ? "" : "s"} with ${data.messageLimit === "all" ? "all available" : data.messageLimit} message${data.messageLimit === 1 ? "" : "s"} each${skipped > 0 ? `, skipped ${skipped} story/empty thread${skipped === 1 ? "" : "s"}` : ""}.`;
    if (!selectedId && state.creators[0]) selectedId = state.creators[0].id;
    currentPage = 1;
    saveState();
    render();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    $("syncInstagramButton").disabled = false;
  }
}

function renderFilters() {
  $("queueFilter").innerHTML = `<option value="all">All statuses</option>${statuses.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}`;
  $("ownerFilter").innerHTML = `<option value="all">All owners</option>${owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`).join("")}`;
  document.querySelector(".view-tabs").innerHTML = views.map(([value, label]) => `<button class="${value === currentView ? "active" : ""}" data-view="${escapeHtml(value)}" type="button">${escapeHtml(label)}</button>`).join("");
}

function renderTable() {
  const rows = filteredCreators();
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);
  $("summaryText").textContent = dashboardSummary();
  if (!pageRows.length) {
    $("creatorTable").innerHTML = `<div class="empty-table">No DMs match this view. Try All or sync more Instagram threads.</div>`;
    $("pagination").innerHTML = "";
    return;
  }
  $("creatorTable").innerHTML = `<div class="table-head">
    ${sortableHeader("creator", "Creator")}
    ${sortableHeader("status", "Status")}
    ${sortableHeader("owner", "Owner")}
    ${sortableHeader("last", "Last message")}
    ${sortableHeader("next", "Next step")}
  </div>${pageRows.map((creator) => {
    const last = matchedDm(creator);
    return `
      <button class="creator-row ${creator.id === selectedId ? "active" : ""}" data-id="${escapeHtml(creator.id)}" type="button">
        <span class="person">
          <span class="avatar">${escapeHtml(initials(creator.name || creator.handle))}</span>
          <span>
            <strong>${escapeHtml(creator.name || creator.handle)}${creator.instagramVerified ? " ✓" : ""}</strong>
            <span>${escapeHtml(creator.handle || creator.instagramUsername || "No handle")} · ${escapeHtml(creator.igFollowers ? `${creator.igFollowers} followers` : creator.rosterState || "Not in sheet yet")}</span>
          </span>
        </span>
        <span class="status-pill status-${escapeHtml(creator.status)}">${escapeHtml(statusLabel(creator.status))}</span>
        <span>${escapeHtml(creator.owner || "Unassigned")}</span>
        <span class="message-preview">
          <strong>${escapeHtml(last ? `${last.direction} · ${last.time}` : "No DMs")}</strong>
          <p>${highlightedHtml(last?.message || "No message yet.")}</p>
        </span>
        <span class="next-step">
          <strong>${highlightedHtml(creator.nextStep || "Set next step")}</strong>
          <span>${escapeHtml(creator.code || creator.sheetStatus || "")}</span>
        </span>
      </button>
    `;
  }).join("")}`;
  renderPagination(rows.length, totalPages, start, pageRows.length);
}

function sortableHeader(key, label) {
  const marker = currentSort.key === key ? (currentSort.direction === "asc" ? " ↑" : " ↓") : "";
  return `<button data-sort="${escapeHtml(key)}" type="button">${escapeHtml(label)}${escapeHtml(marker)}</button>`;
}

function renderPagination(total, totalPages, start, count) {
  $("pagination").innerHTML = `
    <span>Showing ${escapeHtml(start + 1)}-${escapeHtml(start + count)} of ${escapeHtml(total)}</span>
    <div>
      <button data-page="prev" type="button" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
      <button data-page="next" type="button" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
    </div>
  `;
}

function renderDetail() {
  const creator = selectedCreator();
  $("detailEmpty").hidden = Boolean(creator);
  $("detailContent").hidden = !creator;
  if (!creator) return;
  $("detailAvatar").textContent = initials(creator.name || creator.handle);
  $("detailHandle").textContent = creator.handle || creator.instagramUsername || "No Instagram handle";
  $("detailName").textContent = creator.name || creator.handle;
  $("detailStatusPill").className = `status-pill status-${creator.status}`;
  $("detailStatusPill").textContent = statusLabel(creator.status);
  $("ownerSelect").innerHTML = owners.map((owner) => `<option value="${escapeHtml(owner)}" ${owner === creator.owner ? "selected" : ""}>${escapeHtml(owner)}</option>`).join("");
  $("statusSelect").innerHTML = statuses.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === creator.status ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
  $("nextStepInput").value = creator.nextStep || "";
  $("aiSummary").innerHTML = `<strong>${escapeHtml(statusLabel(creator.status))}</strong><span>${escapeHtml(creator.nextStep || "Review latest conversation and set the next step.")}</span>`;
  const messageCount = creator.dms?.length || 0;
  $("latestDm").innerHTML = messageCount
    ? `<span>Showing ${escapeHtml(messageCount)} synced message${messageCount === 1 ? "" : "s"}</span>`
    : `<span>No DMs yet</span>Sync Instagram DMs to load the latest conversation.`;
  $("threadHistory").innerHTML = threadHistoryHtml(creator);
  const canReply = Boolean(creator.instagramParticipantId);
  $("replyHint").textContent = canReply
    ? `Replies will send to @${creator.instagramUsername || creator.handle || creator.name}.`
    : "Sync Instagram DMs to enable replies for this creator.";
  $("sendReplyButton").disabled = !canReply;
  $("replyMessage").disabled = !canReply;
  $("replyMessage").value = creator.suggestedReply || "";
  $("checklist").innerHTML = [
    ["shipping", "Shipping address"],
    ["paypal", "PayPal email"],
    ["assets", "Raw assets uploaded"],
    ["access", "Partnership access"],
    ["paid", "Paid current"],
  ].map(([key, label]) => `<label class="check-row"><span>${escapeHtml(label)}</span><input data-check="${escapeHtml(key)}" type="checkbox" ${creator.checklist?.[key] ? "checked" : ""} /></label>`).join("");
  $("creatorFacts").innerHTML = factRows([
    ["Niche", creator.niche],
    ["IG followers", creator.igFollowers],
    ["Engagement", creator.engagement],
    ["Base fee", creator.baseFee],
    ["Size", creator.size],
    ["Roster", creator.rosterState],
    ["PayPal", creator.paypal],
    ["Shipping", creator.shipping],
    ["Source", creator.source],
  ]);
  const meta = creator.spend?.meta || {};
  const youtube = creator.spend?.youtube || {};
  $("spendFacts").innerHTML = factRows([
    ["Meta spend", meta.spend],
    ["Meta owed", meta.owed],
    ["Meta ROAS", meta.roas],
    ["Meta paid", meta.paid],
    ["YouTube spend", youtube.spend],
    ["YouTube owed", youtube.owed],
    ["YouTube ROAS", youtube.roas],
  ]);
}

function threadHistoryHtml(creator) {
  const messages = (creator.dms || []).slice().reverse();
  if (!messages.length) return "";
  return messages.map((dm) => `
    <div class="thread-message ${escapeHtml(dm.direction)}">
      <span>${escapeHtml(dm.direction)} · ${escapeHtml(dm.time)}</span>
      ${highlightedHtml(dm.message)}
    </div>
  `).join("");
}

function factRows(rows) {
  return rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd title="${escapeHtml(value || "")}">${escapeHtml(value || "Missing")}</dd></div>`).join("");
}

function render() {
  renderMetrics();
  renderTable();
  renderDetail();
  saveState();
}

function seedSample() {
  state = {
    creators: [
      {
        id: "sample-one",
        name: "Creator One",
        handle: "@creatorone",
        niche: "Fitness / Lifestyle",
        igFollowers: "89,200",
        code: "CREATOR10",
        owner: "Ben",
        status: "needs-reply",
        nextStep: "Send onboarding details and collect address, size, PayPal, and partnership access.",
        suggestedReply: "Awesome. Can you send your address, shirt size, and PayPal email? Then we will get the gear and partnership access moving.",
        checklist: { shipping: false, paypal: false, assets: false, access: false, paid: false },
        spend: {},
        rosterState: "New inbound",
        dms: [{ id: "dm-one", identity: "@creatorone", direction: "inbound", time: "24m", message: "Sounds good, I am interested. What do you need from me?" }],
      },
      {
        id: "sample-two",
        name: "Creator Two",
        handle: "@creatortwo",
        niche: "Outdoor",
        igFollowers: "61,900",
        code: "CREATOR20",
        owner: "Jake",
        status: "content-review",
        nextStep: "Review uploaded content, then send edit or approval update.",
        suggestedReply: "Got it, thanks for uploading. We will review the videos and let you know if we need any edits.",
        checklist: { shipping: true, paypal: true, assets: true, access: true, paid: true },
        spend: { meta: { spend: "$9,820", owed: "$295", roas: "3.1", paid: "TRUE" } },
        rosterState: "In sheet: active",
        dms: [{ id: "dm-two", identity: "@creatortwo", direction: "inbound", time: "2h", message: "Just uploaded another handful of videos." }],
      },
      {
        id: "sample-three",
        name: "Creator Three",
        handle: "@creatorthree",
        niche: "Trades",
        igFollowers: "29,800",
        code: "CREATOR30",
        owner: "Maddie",
        status: "payment-question",
        nextStep: "Answer payment question and confirm payout status.",
        suggestedReply: "Totally, I can check that for you. Can you confirm the best PayPal email and I will look up the payout status?",
        checklist: { shipping: true, paypal: true, assets: true, access: true, paid: false },
        spend: { meta: { spend: "$4,210", owed: "$126", roas: "2.6", paid: "FALSE" } },
        rosterState: "In sheet: active",
        dms: [{ id: "dm-three", identity: "@creatorthree", direction: "inbound", time: "11h", message: "Hey, when does the commission payment go out?" }],
      },
    ],
    dms: [],
    unmatched: [],
  };
  selectedId = "sample-one";
  currentView = "attention";
  currentPage = 1;
  renderFilters();
  render();
}

function csvSafe(value) {
  const text = String(value ?? "");
  const protectedText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const headers = ["Name", "Instagram Handle", "Owner", "Status", "Next Step", "Suggested Reply", "Code", "PayPal Email", "Shipping Address", "Latest DM", "Meta Spend", "Meta Owed", "Meta ROAS"];
  const lines = [headers.map(csvSafe).join(",")];
  state.creators.forEach((creator) => {
    const latest = latestDm(creator)?.message || "";
    const meta = creator.spend?.meta || {};
    lines.push([
      creator.name,
      creator.handle,
      creator.owner,
      statusLabel(creator.status),
      creator.nextStep,
      creator.suggestedReply,
      creator.code,
      creator.paypal,
      creator.shipping,
      latest,
      meta.spend,
      meta.owed,
      meta.roas,
    ].map(csvSafe).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "creatorboard-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  $("creatorFiles").addEventListener("change", (event) => importCreatorFiles([...event.target.files]).catch(alert));
  $("spendFiles").addEventListener("change", (event) => importSpendFiles([...event.target.files]).catch(alert));
  $("seedButton").addEventListener("click", seedSample);
  $("syncInstagramButton").addEventListener("click", syncInstagram);
  $("exportButton").addEventListener("click", exportCsv);
  $("clearButton").addEventListener("click", () => {
    if (!confirm("Clear CreatorBoard data stored in this browser?")) return;
    localStorage.removeItem(STORE_KEY);
    state = { creators: [], dms: [], unmatched: [] };
    selectedId = "";
    render();
  });
  $("searchInput").addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });
  $("queueFilter").addEventListener("change", () => {
    currentPage = 1;
    renderTable();
  });
  $("ownerFilter").addEventListener("change", () => {
    currentPage = 1;
    renderTable();
  });
  document.querySelector(".view-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    currentView = button.dataset.view;
    currentPage = 1;
    document.querySelectorAll(".view-tabs button").forEach((item) => item.classList.toggle("active", item === button));
    renderTable();
  });
  $("creatorTable").addEventListener("click", (event) => {
    const sortButton = event.target.closest("button[data-sort]");
    if (sortButton) {
      setSort(sortButton.dataset.sort);
      return;
    }
    const row = event.target.closest(".creator-row[data-id]");
    if (!row) return;
    selectedId = row.dataset.id;
    render();
  });
  $("pagination").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button) return;
    currentPage += button.dataset.page === "next" ? 1 : -1;
    renderTable();
  });
  $("closeDetailButton").addEventListener("click", () => {
    selectedId = "";
    render();
  });
  $("saveDetailButton").addEventListener("click", () => {
    const creator = selectedCreator();
    if (!creator) return;
    creator.owner = $("ownerSelect").value;
    creator.status = $("statusSelect").value;
    creator.nextStep = $("nextStepInput").value.trim();
    creator.suggestedReply = $("replyMessage").value.trim();
    render();
  });
  $("markDoneButton").addEventListener("click", () => setSelectedStatus("done", "Closed out. No further action right now."));
  $("markPausedButton").addEventListener("click", () => setSelectedStatus("paused", "Marked as not working. Remove from active follow-up."));
  $("sendReplyButton").addEventListener("click", sendInstagramReply);
  $("checklist").addEventListener("change", (event) => {
    const key = event.target.dataset.check;
    const creator = selectedCreator();
    if (!key || !creator) return;
    creator.checklist = creator.checklist || {};
    creator.checklist[key] = event.target.checked;
    render();
  });
}

function setSort(key) {
  if (currentSort.key === key) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort = { key, direction: key === "last" ? "desc" : "asc" };
  }
  currentPage = 1;
  renderTable();
}

function setSelectedStatus(status, nextStep) {
  const creator = selectedCreator();
  if (!creator) return;
  creator.status = status;
  creator.nextStep = nextStep;
  creator.suggestedReply = "";
  render();
}

async function sendInstagramReply() {
  const creator = selectedCreator();
  const message = $("replyMessage").value.trim();
  if (!creator?.instagramParticipantId) {
    alert("Sync Instagram DMs first so CreatorBoard has the recipient ID.");
    return;
  }
  if (!message) return;
  $("sendReplyButton").disabled = true;
  $("replyHint").textContent = "Sending reply...";
  try {
    const response = await fetch("/api/instagram/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: creator.instagramParticipantId, message }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Reply failed.");
    addDm({
      identity: creator.handle || creator.instagramUsername || creator.name,
      message,
      direction: "outbound",
      time: "now",
      sourceId: data.messageId || "",
      conversationId: creator.instagramConversationId || "",
      participantId: creator.instagramParticipantId,
      username: creator.instagramUsername || "",
    });
    $("replyMessage").value = "";
    creator.status = "waiting-creator";
    creator.nextStep = "Waiting on creator reply.";
    creator.suggestedReply = "";
    saveState();
    render();
  } catch (error) {
    $("replyHint").textContent = error.message;
  } finally {
    $("sendReplyButton").disabled = !selectedCreator()?.instagramParticipantId;
  }
}

sanitizeLoadedState();
renderFilters();
bindEvents();
render();
refreshInstagramStatus();
