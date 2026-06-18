const STORE_KEY = "creatorboard.v1";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 1500;

const statuses = [
  ["needs-reply", "Needs reply"],
  ["waiting-creator", "Waiting on creator"],
  ["team-action", "Team action"],
  ["ready-run", "Ready to run"],
  ["active-ad", "Active ad"],
  ["payment-due", "Payment due"],
  ["paused", "Paused"],
];

const owners = ["Team", "Unassigned", "Ops", "Media", "Support"];

let state = loadState();
let selectedId = state.creators[0]?.id || "";
let currentView = "queue";

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

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]/g, "");
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
    rosterState: val(row, ["Status"]) === "1" ? "Active" : "New / review",
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
    creator.status = "payment-due";
    creator.nextStep ||= "Review unpaid creator balance.";
  }
  return true;
}

function findCreator(identity) {
  const needle = normalize(identity);
  if (!needle) return null;
  return state.creators.find((creator) => {
    return normalize(creator.handle) === needle || normalize(creator.name) === needle || normalize(creator.handle).includes(needle) || normalize(creator.name).includes(needle);
  }) || null;
}

function upsertCreator(creator) {
  const index = state.creators.findIndex((item) => item.id === creator.id || normalize(item.handle) === normalize(creator.handle) && creator.handle);
  if (index >= 0) state.creators[index] = { ...state.creators[index], ...creator };
  else state.creators.push(creator);
}

function addDm({ identity, message, direction = "inbound", time = "now" }) {
  const trimmedIdentity = identity.trim();
  const trimmedMessage = message.trim();
  if (!trimmedIdentity || !trimmedMessage) return;
  const dm = {
    id: makeId("dm"),
    identity: trimmedIdentity.slice(0, 120),
    message: trimmedMessage.slice(0, 1200),
    direction: direction === "outbound" ? "outbound" : "inbound",
    time: time.slice(0, 40) || "now",
    createdAt: new Date().toISOString(),
  };
  const creator = findCreator(trimmedIdentity);
  if (!creator) {
    state.unmatched.unshift(dm);
    return;
  }
  dm.creatorId = creator.id;
  creator.dms = creator.dms || [];
  creator.dms.unshift(dm);
  creator.status = dm.direction === "inbound" ? "needs-reply" : "waiting-creator";
  creator.nextStep = dm.direction === "inbound" ? "Reply to latest DM." : creator.nextStep || "Waiting on creator reply.";
  state.dms.unshift(dm);
  selectedId = creator.id;
}

function addInstagramConversation(conversation) {
  const latest = conversation.latestMessage || {};
  const message = latest.message || conversation.messages?.find((item) => item.message)?.message || "";
  if (!conversation.identity || !message) return;
  addDm({
    identity: conversation.identity,
    message,
    direction: latest.direction || "inbound",
    time: formatTime(latest.createdTime || conversation.updatedTime),
  });
  const creator = findCreator(conversation.identity);
  if (creator) {
    creator.instagramConversationId = conversation.conversationId;
    creator.instagramParticipantId = conversation.participant?.id || creator.instagramParticipantId;
    creator.instagramUsername = conversation.participant?.username || creator.instagramUsername;
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
  reconcileUnmatched();
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
  return statuses.find(([value]) => value === status)?.[1] || "Team action";
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

function initials(name) {
  return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function filteredCreators() {
  const query = normalize($("searchInput").value);
  const queue = $("queueFilter").value;
  const owner = $("ownerFilter").value;
  return state.creators.filter((creator) => {
    const text = normalize(`${creator.name} ${creator.handle} ${creator.code} ${creator.nextStep} ${creator.niche}`);
    return (!query || text.includes(query)) && (queue === "all" || creator.status === queue) && (owner === "all" || creator.owner === owner);
  });
}

function renderMetrics() {
  const counts = {
    creators: state.creators.length,
    needsReply: state.creators.filter((creator) => creator.status === "needs-reply").length,
    teamAction: state.creators.filter((creator) => creator.status === "team-action").length,
    paymentDue: state.creators.filter((creator) => creator.status === "payment-due").length,
    unmatched: state.unmatched.length,
  };
  $("metrics").innerHTML = [
    ["Creators", counts.creators],
    ["Needs reply", counts.needsReply],
    ["Team action", counts.teamAction],
    ["Payment due", counts.paymentDue],
    ["Unmatched DMs", counts.unmatched],
  ].map(([label, value]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
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
  const messageLimit = Number($("instagramMessageLimit").value || 3);
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
    data.conversations.forEach(addInstagramConversation);
    status.textContent = `Synced ${data.count} Instagram thread${data.count === 1 ? "" : "s"}.`;
    saveState();
    render();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    $("syncInstagramButton").disabled = false;
  }
}

function reconcileUnmatched() {
  const stillUnmatched = [];
  state.unmatched.forEach((dm) => {
    const creator = findCreator(dm.identity);
    if (!creator) {
      stillUnmatched.push(dm);
      return;
    }
    dm.creatorId = creator.id;
    creator.dms = creator.dms || [];
    creator.dms.unshift(dm);
    creator.status = dm.direction === "inbound" ? "needs-reply" : "waiting-creator";
    creator.nextStep = dm.direction === "inbound" ? "Reply to latest DM." : creator.nextStep || "Waiting on creator reply.";
    state.dms.unshift(dm);
  });
  state.unmatched = stillUnmatched;
}

function renderFilters() {
  $("queueFilter").innerHTML = `<option value="all">All statuses</option>${statuses.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}`;
  $("ownerFilter").innerHTML = `<option value="all">All owners</option>${owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`).join("")}`;
}

function renderTable() {
  const rows = currentView === "unmatched" ? state.unmatched : filteredCreators();
  $("summaryText").textContent = currentView === "unmatched"
    ? `${state.unmatched.length} imported DMs need a creator match.`
    : `${filteredCreators().length} creators shown, ${state.creators.length} total.`;
  if (!rows.length) {
    $("creatorTable").innerHTML = `<div class="empty-table">${currentView === "unmatched" ? "No unmatched DMs." : "No creators match this view."}</div>`;
    return;
  }
  if (currentView === "unmatched") {
    $("creatorTable").innerHTML = `<div class="table-head"><span>DM identity</span><span>Direction</span><span>Time</span><span>Message</span><span>Match</span></div>${rows.map((dm) => `
      <button class="creator-row" data-unmatched="${escapeHtml(dm.id)}" type="button">
        <span class="person"><span class="avatar">?</span><span><strong>${escapeHtml(dm.identity)}</strong><span>Unmatched</span></span></span>
        <span>${escapeHtml(dm.direction)}</span>
        <span>${escapeHtml(dm.time)}</span>
        <span class="truncate">${escapeHtml(dm.message)}</span>
        <span class="status-pill">Click to match</span>
      </button>
    `).join("")}`;
    return;
  }
  $("creatorTable").innerHTML = `<div class="table-head"><span>Creator</span><span>Status</span><span>Owner</span><span>Next step</span><span>Last DM</span></div>${rows.map((creator) => {
    const last = creator.dms?.[0];
    return `
      <button class="creator-row ${creator.id === selectedId ? "active" : ""}" data-id="${escapeHtml(creator.id)}" type="button">
        <span class="person"><span class="avatar">${escapeHtml(initials(creator.name))}</span><span><strong>${escapeHtml(creator.name || creator.handle)}</strong><span>${escapeHtml(creator.handle || "No handle")} · ${escapeHtml(creator.code || "No code")}</span></span></span>
        <span class="status-pill status-${escapeHtml(creator.status)}">${escapeHtml(statusLabel(creator.status))}</span>
        <span>${escapeHtml(creator.owner || "Unassigned")}</span>
        <span class="truncate">${escapeHtml(creator.nextStep || "Set next step")}</span>
        <span class="subline">${escapeHtml(last ? `${last.direction} · ${last.time}` : "No DMs")}</span>
      </button>
    `;
  }).join("")}`;
}

function renderDetail() {
  const creator = selectedCreator();
  $("detailEmpty").hidden = Boolean(creator);
  $("detailContent").hidden = !creator;
  if (!creator) return;
  $("detailAvatar").textContent = initials(creator.name);
  $("detailHandle").textContent = creator.handle || "No Instagram handle";
  $("detailName").textContent = creator.name || creator.handle;
  $("ownerSelect").innerHTML = owners.map((owner) => `<option value="${escapeHtml(owner)}" ${owner === creator.owner ? "selected" : ""}>${escapeHtml(owner)}</option>`).join("");
  $("statusSelect").innerHTML = statuses.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === creator.status ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
  $("nextStepInput").value = creator.nextStep || "";
  const dm = creator.dms?.[0];
  $("latestDm").innerHTML = dm
    ? `<span>${escapeHtml(dm.direction)} · ${escapeHtml(dm.time)}</span>${escapeHtml(dm.message)}`
    : `<span>No DM matched yet</span>Add the latest IG DM from the left panel.`;
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
        id: "sample-avery",
        name: "Avery Cole",
        handle: "@averycreates",
        niche: "Fitness / Lifestyle",
        igFollowers: "89,200",
        code: "AVERY10",
        owner: "Team",
        status: "needs-reply",
        nextStep: "Reply and collect shipping details, payout email, upload folder, and partnership access.",
        checklist: { shipping: false, paypal: false, assets: false, access: false, paid: false },
        spend: {},
        dms: [{ id: "dm-avery", identity: "@averycreates", direction: "outbound", time: "24m", message: "Hey, Avery. We can send the brief today. Once the first raw clips are uploaded, the team can review and mark the ad ready." }],
      },
      {
        id: "sample-jordan",
        name: "Jordan Sage",
        handle: "@jordansage",
        niche: "Fitness",
        igFollowers: "61,900",
        code: "JORDAN10",
        owner: "Media",
        status: "team-action",
        nextStep: "Need shipping details before fulfillment can send the package.",
        checklist: { shipping: false, paypal: true, assets: false, access: true, paid: true },
        spend: { meta: { spend: "$9,820", owed: "$295", roas: "3.1", paid: "TRUE" } },
        dms: [{ id: "dm-jordan", identity: "@jordansage", direction: "inbound", time: "2h", message: "Yup I accepted it. Sounds good." }],
      },
      {
        id: "sample-morgan",
        name: "Morgan Reid",
        handle: "@morganfilms",
        niche: "Trades",
        igFollowers: "29,800",
        code: "MORGAN10",
        owner: "Ops",
        status: "needs-reply",
        nextStep: "Send Drive upload folder and simple filming notes.",
        checklist: { shipping: true, paypal: true, assets: false, access: false, paid: false },
        spend: { meta: { spend: "$4,210", owed: "$126", roas: "2.6", paid: "FALSE" } },
        dms: [{ id: "dm-morgan", identity: "@morganfilms", direction: "inbound", time: "11h", message: "I can definitely put together a couple videos this week." }],
      },
    ],
    dms: [],
    unmatched: [],
  };
  selectedId = "sample-lacey";
  render();
}

function csvSafe(value) {
  const text = String(value ?? "");
  const protectedText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const headers = ["Name", "Instagram Handle", "Owner", "Status", "Next Step", "Code", "PayPal Email", "Shipping Address", "Latest DM", "Meta Spend", "Meta Owed", "Meta ROAS"];
  const lines = [headers.map(csvSafe).join(",")];
  state.creators.forEach((creator) => {
    const latest = creator.dms?.[0]?.message || "";
    const meta = creator.spend?.meta || {};
    lines.push([
      creator.name,
      creator.handle,
      creator.owner,
      statusLabel(creator.status),
      creator.nextStep,
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
  $("dmForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addDm({ identity: $("dmIdentity").value, message: $("dmMessage").value, direction: $("dmDirection").value, time: $("dmTime").value });
    $("dmIdentity").value = "";
    $("dmMessage").value = "";
    saveState();
    render();
  });
  $("importDmCsvButton").addEventListener("click", () => {
    const text = $("dmCsvText").value;
    if (!text.trim()) return;
    importDmObjects(rowsToObjects(parseCsv(text)));
    $("dmCsvText").value = "";
    saveState();
    render();
  });
  $("searchInput").addEventListener("input", renderTable);
  $("queueFilter").addEventListener("change", renderTable);
  $("ownerFilter").addEventListener("change", renderTable);
  document.querySelector(".view-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    currentView = button.dataset.view;
    document.querySelectorAll(".view-tabs button").forEach((item) => item.classList.toggle("active", item === button));
    renderTable();
  });
  $("creatorTable").addEventListener("click", (event) => {
    const unmatchedRow = event.target.closest(".creator-row[data-unmatched]");
    if (unmatchedRow) {
      matchUnmatchedDm(unmatchedRow.dataset.unmatched);
      return;
    }
    const row = event.target.closest(".creator-row[data-id]");
    if (!row) return;
    selectedId = row.dataset.id;
    render();
  });
  $("saveDetailButton").addEventListener("click", () => {
    const creator = selectedCreator();
    if (!creator) return;
    creator.owner = $("ownerSelect").value;
    creator.status = $("statusSelect").value;
    creator.nextStep = $("nextStepInput").value.trim();
    render();
  });
  $("checklist").addEventListener("change", (event) => {
    const key = event.target.dataset.check;
    const creator = selectedCreator();
    if (!key || !creator) return;
    creator.checklist = creator.checklist || {};
    creator.checklist[key] = event.target.checked;
    render();
  });
}

renderFilters();
bindEvents();
render();
refreshInstagramStatus();

function matchUnmatchedDm(dmId) {
  const dmIndex = state.unmatched.findIndex((dm) => dm.id === dmId);
  if (dmIndex < 0) return;
  const dm = state.unmatched[dmIndex];
  const identity = prompt("Match this DM to which creator handle or name?", dm.identity);
  if (!identity) return;
  let creator = findCreator(identity);
  if (!creator) {
    const create = confirm("No matching creator found. Create a new creator from this DM?");
    if (!create) return;
    creator = {
      id: makeId("creator"),
      name: identity.replace(/^@/, ""),
      handle: identity.startsWith("@") ? identity : "",
      owner: "Unassigned",
      status: "needs-reply",
      nextStep: "Review new creator and set next step.",
      checklist: {},
      spend: {},
      dms: [],
      rosterState: "New / review",
      source: "IG DM",
    };
    upsertCreator(creator);
  }
  state.unmatched.splice(dmIndex, 1);
  dm.creatorId = creator.id;
  creator.dms = creator.dms || [];
  creator.dms.unshift(dm);
  creator.status = dm.direction === "inbound" ? "needs-reply" : "waiting-creator";
  creator.nextStep = dm.direction === "inbound" ? "Reply to latest DM." : creator.nextStep || "Waiting on creator reply.";
  state.dms.unshift(dm);
  selectedId = creator.id;
  currentView = "queue";
  document.querySelectorAll(".view-tabs button").forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  render();
}
