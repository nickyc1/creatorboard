"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Status =
  | "Needs response"
  | "Content uploaded"
  | "Edit needed"
  | "Payment question"
  | "Waiting on creator"
  | "Access needed"
  | "Saved"
  | "Done";

type Owner = "Alex" | "Mia" | "Nick";
type ViewKey = "auto" | "response" | "content" | "payments" | "waiting" | "saved" | "completed";

type Message = {
  side: "creator" | "team";
  time: string;
  text: string;
};

type Thread = {
  id: number;
  creator: string;
  handle: string;
  avatarUrl?: string;
  followers: string;
  status: Status;
  owner: Owner;
  age: string;
  minutesOld: number;
  lastMessage: string;
  summary: string;
  nextStep: string;
  source: "Primary" | "General" | "Request";
  effortMinutes: number;
  messages: Message[];
};

const threads: Thread[] = [
  {
    id: 1,
    creator: "Avery Lane",
    handle: "averylane.fit",
    followers: "84.2k",
    status: "Needs response",
    owner: "Nick",
    age: "34m",
    minutesOld: 34,
    source: "General",
    effortMinutes: 8,
    lastMessage: "Can I send the YouTube cut too or just IG?",
    summary: "Creator uploaded raw clips and is asking whether a YouTube version is useful.",
    nextStep: "Reply: yes, send the YouTube cut in the same Drive folder. Confirm IG is still first priority.",
    messages: [
      { side: "team", time: "Yesterday", text: "Send raw clips in Drive when ready." },
      { side: "creator", time: "34m", text: "Can I send the YouTube cut too or just IG?" },
    ],
  },
  {
    id: 2,
    creator: "Micah Rowe",
    handle: "micahmoves",
    followers: "51.8k",
    status: "Payment question",
    owner: "Alex",
    age: "2h",
    minutesOld: 120,
    source: "Primary",
    effortMinutes: 14,
    lastMessage: "I still have not seen the PayPal payment come through.",
    summary: "Creator says payment has not landed after the latest content batch.",
    nextStep: "Check payment sheet, confirm amount, then reply with expected timing.",
    messages: [
      { side: "creator", time: "Last week", text: "I uploaded the second batch in the folder. There are three raw clips and one quick edit." },
      { side: "team", time: "Last week", text: "Perfect, we have the files. The editing team is going to check hooks and get the usable clips queued." },
      { side: "creator", time: "Fri", text: "Sounds good. Just want to make sure this counts toward the batch we discussed." },
      { side: "team", time: "Fri", text: "Yes, this batch counts. If we use more than one angle, we will note that on the sheet." },
      { side: "creator", time: "Mon", text: "Sent the second batch. Let me know if it works." },
      { side: "team", time: "Tue", text: "Got it. We will review and get payment queued." },
      { side: "creator", time: "Yesterday", text: "Checking on this again. I am trying to reconcile what is in PayPal with the videos I sent over." },
      { side: "team", time: "Yesterday", text: "I am checking the spend sheet and payout log now. I will send the exact number once I confirm it." },
      { side: "creator", time: "2h", text: "I still have not seen the PayPal payment come through." },
    ],
  },
  {
    id: 3,
    creator: "Jordan Pike",
    handle: "jordanpike.co",
    followers: "126k",
    status: "Content uploaded",
    owner: "Mia",
    age: "5h",
    minutesOld: 300,
    source: "Primary",
    effortMinutes: 20,
    lastMessage: "Uploaded four hooks and the long take.",
    summary: "Creator uploaded new content. Team needs to review assets before launch.",
    nextStep: "Review folder, choose usable hooks, and mark whether editing is needed.",
    messages: [
      { side: "team", time: "Yesterday", text: "Send a few hooks plus one longer take." },
      { side: "creator", time: "5h", text: "Uploaded four hooks and the long take." },
    ],
  },
  {
    id: 4,
    creator: "Taylor Reed",
    handle: "realtaylorreed",
    followers: "39.4k",
    status: "Waiting on creator",
    owner: "Nick",
    age: "1d",
    minutesOld: 1440,
    source: "General",
    effortMinutes: 3,
    lastMessage: "I can film this weekend.",
    summary: "Creator accepted the brief and is planning to film this weekend.",
    nextStep: "No reply needed. Check back Monday if nothing is uploaded.",
    messages: [
      { side: "creator", time: "1d", text: "I can film this weekend." },
      { side: "team", time: "1d", text: "Perfect. Send it over when it is ready." },
    ],
  },
  {
    id: 5,
    creator: "Noah Kent",
    handle: "noahkent",
    followers: "73.1k",
    status: "Access needed",
    owner: "Alex",
    age: "2d",
    minutesOld: 2880,
    source: "Primary",
    effortMinutes: 11,
    lastMessage: "Do you still need my shipping address?",
    summary: "Creator needs gear before filming. Address has not been captured.",
    nextStep: "Ask for address, shirt size, and email. Add to roster once received.",
    messages: [{ side: "creator", time: "2d", text: "Do you still need my shipping address?" }],
  },
  {
    id: 6,
    creator: "Mira Stone",
    handle: "mirastoneugc",
    followers: "22.7k",
    status: "Edit needed",
    owner: "Mia",
    age: "3d",
    minutesOld: 4320,
    source: "Request",
    effortMinutes: 18,
    lastMessage: "The raw file is in the folder. Let me know if you need another hook.",
    summary: "Raw file is uploaded, but the hook is weak and needs a tighter opening.",
    nextStep: "Ask for one more hook with product visible in the first two seconds.",
    messages: [
      { side: "team", time: "4d", text: "Can you upload the raw file today?" },
      { side: "creator", time: "3d", text: "The raw file is in the folder. Let me know if you need another hook." },
    ],
  },
  {
    id: 7,
    creator: "Cam Ellis",
    handle: "camclips",
    followers: "18.9k",
    status: "Needs response",
    owner: "Nick",
    age: "4h",
    minutesOld: 240,
    source: "Request",
    effortMinutes: 7,
    lastMessage: "I can do the bundle but need the brief again.",
    summary: "Creator is interested but lost the brief and upload instructions.",
    nextStep: "Send the current brief, Drive folder, and reminder that raw clips are best.",
    messages: [
      { side: "team", time: "6d", text: "Would love to get two short raw clips this week." },
      { side: "creator", time: "4h", text: "I can do the bundle but need the brief again." },
    ],
  },
  {
    id: 8,
    creator: "Drew Nolan",
    handle: "drewnolanfit",
    followers: "44.6k",
    status: "Content uploaded",
    owner: "Mia",
    age: "6h",
    minutesOld: 360,
    source: "Primary",
    effortMinutes: 24,
    lastMessage: "I added three hooks and one talking head to the folder.",
    summary: "New files are uploaded and likely need edit review before ad launch.",
    nextStep: "Review hooks, tag the best one, and ask for reshoot only if product is hidden.",
    messages: [
      { side: "team", time: "Yesterday", text: "Try to keep the product visible in the first two seconds." },
      { side: "creator", time: "6h", text: "I added three hooks and one talking head to the folder." },
    ],
  },
  {
    id: 9,
    creator: "Kara Vale",
    handle: "karavalemedia",
    followers: "61.2k",
    status: "Payment question",
    owner: "Alex",
    age: "8h",
    minutesOld: 480,
    source: "General",
    effortMinutes: 16,
    lastMessage: "Was the bonus included for the last video?",
    summary: "Creator is asking whether the performance bonus was included.",
    nextStep: "Check spend sheet and reply with the exact bonus calculation.",
    messages: [
      { side: "creator", time: "8h", text: "Was the bonus included for the last video?" },
    ],
  },
  {
    id: 10,
    creator: "Riley Fox",
    handle: "rileyfoxoutdoors",
    followers: "27.5k",
    status: "Needs response",
    owner: "Nick",
    age: "10h",
    minutesOld: 600,
    source: "Primary",
    effortMinutes: 9,
    lastMessage: "I am good with 3% but can we start next week?",
    summary: "Creator accepted the ad spend share and wants to start next week.",
    nextStep: "Confirm start timing and ask for PayPal plus shipping address.",
    messages: [
      { side: "team", time: "Yesterday", text: "We pay 3% of ad spend plus affiliate commission." },
      { side: "creator", time: "10h", text: "I am good with 3% but can we start next week?" },
    ],
  },
  {
    id: 11,
    creator: "Jules Hart",
    handle: "juleshartdaily",
    followers: "31.4k",
    status: "Edit needed",
    owner: "Mia",
    age: "12h",
    minutesOld: 720,
    source: "General",
    effortMinutes: 22,
    lastMessage: "I uploaded the second version with less music.",
    summary: "Creator revised the content. Team needs to confirm whether audio works for ads.",
    nextStep: "Review the revised cut and mark edit approved or request raw file.",
    messages: [
      { side: "team", time: "Yesterday", text: "Can you send a version with cleaner audio?" },
      { side: "creator", time: "12h", text: "I uploaded the second version with less music." },
    ],
  },
  {
    id: 12,
    creator: "Ben Hayes",
    handle: "benhayesgear",
    followers: "92.8k",
    status: "Waiting on creator",
    owner: "Nick",
    age: "14h",
    minutesOld: 840,
    source: "Primary",
    effortMinutes: 3,
    lastMessage: "I will shoot when the package lands.",
    summary: "Creator is waiting for product delivery before filming.",
    nextStep: "No reply needed. Check tracking tomorrow if delivery is still pending.",
    messages: [
      { side: "team", time: "2d", text: "Gear is on the way. Send clips when it lands." },
      { side: "creator", time: "14h", text: "I will shoot when the package lands." },
    ],
  },
  {
    id: 13,
    creator: "Sasha Gray",
    handle: "sashagraycreates",
    followers: "15.6k",
    status: "Needs response",
    owner: "Alex",
    age: "16h",
    minutesOld: 960,
    source: "Request",
    effortMinutes: 10,
    lastMessage: "Do you have examples of videos that are working right now?",
    summary: "Creator wants examples before filming their first batch.",
    nextStep: "Send three example angles and tell them to keep it casual.",
    messages: [
      { side: "creator", time: "16h", text: "Do you have examples of videos that are working right now?" },
    ],
  },
  {
    id: 14,
    creator: "Ty Brooks",
    handle: "tybrookstrain",
    followers: "58.3k",
    status: "Content uploaded",
    owner: "Mia",
    age: "18h",
    minutesOld: 1080,
    source: "Primary",
    effortMinutes: 21,
    lastMessage: "Shared a Drive with five raws and two quick edits.",
    summary: "Creator uploaded multiple assets. Needs selection and editing notes.",
    nextStep: "Pick top two raw clips, mark edit priority, and thank creator.",
    messages: [
      { side: "team", time: "3d", text: "A few raw phone clips work better than polished edits." },
      { side: "creator", time: "18h", text: "Shared a Drive with five raws and two quick edits." },
    ],
  },
  {
    id: 15,
    creator: "Logan Ray",
    handle: "loganrayfit",
    followers: "19.8k",
    status: "Access needed",
    owner: "Nick",
    age: "19h",
    minutesOld: 1140,
    source: "General",
    effortMinutes: 12,
    lastMessage: "Where do I approve the partnership ad access?",
    summary: "Creator needs instructions for partnership ad access.",
    nextStep: "Send access steps and ask them to confirm once the request is approved.",
    messages: [
      { side: "creator", time: "19h", text: "Where do I approve the partnership ad access?" },
    ],
  },
  {
    id: 16,
    creator: "Nora Wells",
    handle: "norawellsugc",
    followers: "24.1k",
    status: "Saved",
    owner: "Alex",
    age: "20h",
    minutesOld: 1200,
    source: "Primary",
    effortMinutes: 6,
    lastMessage: "Saving this for Monday, I am out this weekend.",
    summary: "Thread is pinned for Monday follow-up.",
    nextStep: "Follow up Monday morning if the raw clips are not uploaded.",
    messages: [
      { side: "creator", time: "20h", text: "Saving this for Monday, I am out this weekend." },
    ],
  },
  {
    id: 17,
    creator: "Max Cline",
    handle: "maxclineoutdoors",
    followers: "33.9k",
    status: "Done",
    owner: "Alex",
    age: "1d",
    minutesOld: 1441,
    source: "Primary",
    effortMinutes: 0,
    lastMessage: "Got it, thanks.",
    summary: "Creator confirmed the next step and no team action is needed.",
    nextStep: "Closed. Reopen only if new message arrives.",
    messages: [
      { side: "team", time: "1d", text: "Payment is queued for Friday." },
      { side: "creator", time: "1d", text: "Got it, thanks." },
    ],
  },
  {
    id: 18,
    creator: "Parker Vale",
    handle: "parkervaleads",
    followers: "47.2k",
    status: "Needs response",
    owner: "Nick",
    age: "1d",
    minutesOld: 1500,
    source: "Request",
    effortMinutes: 13,
    lastMessage: "Can I do this as a monthly batch instead of weekly?",
    summary: "Creator wants monthly batching. Team needs to confirm workflow.",
    nextStep: "Approve monthly batch if they can deliver four usable raws per month.",
    messages: [
      { side: "creator", time: "1d", text: "Can I do this as a monthly batch instead of weekly?" },
    ],
  },
  {
    id: 19,
    creator: "Ivy Morgan",
    handle: "ivymorganwellness",
    followers: "28.4k",
    status: "Waiting on creator",
    owner: "Mia",
    age: "2d",
    minutesOld: 2881,
    source: "General",
    effortMinutes: 4,
    lastMessage: "I will send the raw clips tonight.",
    summary: "Creator owes the upload and does not need another reply yet.",
    nextStep: "Wait. If nothing lands tomorrow, ask for a quick update.",
    messages: [
      { side: "team", time: "2d", text: "Can you send the raws by tonight?" },
      { side: "creator", time: "2d", text: "I will send the raw clips tonight." },
    ],
  },
  {
    id: 20,
    creator: "Theo Clark",
    handle: "theoclarkdaily",
    followers: "12.3k",
    status: "Needs response",
    owner: "Alex",
    age: "2d",
    minutesOld: 3000,
    source: "Request",
    effortMinutes: 8,
    lastMessage: "Is there a minimum follower count for this?",
    summary: "New creator is asking if they qualify.",
    nextStep: "Reply with the baseline criteria and ask for media kit or recent reach.",
    messages: [
      { side: "creator", time: "2d", text: "Is there a minimum follower count for this?" },
    ],
  },
  {
    id: 21,
    creator: "Lena Cruz",
    handle: "lenacruzfit",
    followers: "55.7k",
    status: "Payment question",
    owner: "Nick",
    age: "3d",
    minutesOld: 4321,
    source: "Primary",
    effortMinutes: 15,
    lastMessage: "Can you resend the affiliate link report?",
    summary: "Creator needs the commission report to reconcile payout.",
    nextStep: "Export affiliate report and send the payout summary.",
    messages: [
      { side: "creator", time: "3d", text: "Can you resend the affiliate link report?" },
    ],
  },
  {
    id: 22,
    creator: "Owen Lee",
    handle: "owenleefilms",
    followers: "37.9k",
    status: "Edit needed",
    owner: "Mia",
    age: "4d",
    minutesOld: 5760,
    source: "General",
    effortMinutes: 19,
    lastMessage: "I can re-cut the opening if needed.",
    summary: "Creator is open to a new hook. Existing cut likely starts too slow.",
    nextStep: "Ask for a faster opening with the product visible immediately.",
    messages: [
      { side: "team", time: "4d", text: "The footage is good but the first line is a little slow." },
      { side: "creator", time: "4d", text: "I can re-cut the opening if needed." },
    ],
  },
  {
    id: 23,
    creator: "Maddie Price",
    handle: "maddiepricefit",
    followers: "69.5k",
    status: "Access needed",
    owner: "Nick",
    age: "5d",
    minutesOld: 7200,
    source: "Primary",
    effortMinutes: 12,
    lastMessage: "I still do not see the request in Instagram.",
    summary: "Partnership access request may not have been sent or may be under another account.",
    nextStep: "Verify handle, resend partnership ad request, then send confirmation screenshot.",
    messages: [
      { side: "creator", time: "5d", text: "I still do not see the request in Instagram." },
    ],
  },
  {
    id: 24,
    creator: "Cole Turner",
    handle: "coleturnerugc",
    followers: "21.2k",
    status: "Done",
    owner: "Mia",
    age: "6d",
    minutesOld: 8640,
    source: "Request",
    effortMinutes: 0,
    lastMessage: "Sounds good, I will pass for now.",
    summary: "Creator declined. No action needed.",
    nextStep: "Closed. Keep out of active creator queue.",
    messages: [
      { side: "team", time: "6d", text: "Totally fine either way. Want me to keep you on the list?" },
      { side: "creator", time: "6d", text: "Sounds good, I will pass for now." },
    ],
  },
];

const views: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: "auto", label: "Auto triage", hint: "All open work" },
  { key: "response", label: "Needs response", hint: "Team owes a reply" },
  { key: "content", label: "Content queue", hint: "Uploads and edits" },
  { key: "payments", label: "Payments", hint: "Money questions" },
  { key: "waiting", label: "Waiting", hint: "Creator owes next step" },
  { key: "saved", label: "Saved", hint: "Pinned threads" },
  { key: "completed", label: "Completed", hint: "Closed work" },
];

const team: Array<{ owner: Owner; total: number; estimate: string; focus: string }> = [
  { owner: "Alex", total: 18, estimate: "2h 20m", focus: "payments and access" },
  { owner: "Mia", total: 9, estimate: "2h 05m", focus: "content review" },
  { owner: "Nick", total: 42, estimate: "3h 35m", focus: "unassigned replies" },
];

const statuses: Array<Status | "All statuses"> = [
  "All statuses",
  "Needs response",
  "Content uploaded",
  "Edit needed",
  "Payment question",
  "Waiting on creator",
  "Access needed",
  "Saved",
  "Done",
];

export default function InboxShell() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "All statuses">("All statuses");
  const [activeView, setActiveView] = useState<ViewKey>("auto");
  const [selectedTeam, setSelectedTeam] = useState<Owner | null>(null);
  const [selectedId, setSelectedId] = useState(threads[0].id);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "complete">("idle");

  const visibleThreads = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return threads
      .filter((thread) => matchesView(thread, activeView))
      .filter((thread) => !selectedTeam || thread.owner === selectedTeam)
      .filter((thread) => status === "All statuses" || thread.status === status)
      .filter((thread) => {
        const searchableText = [
          thread.creator,
          thread.handle,
          thread.status,
          thread.owner,
          thread.lastMessage,
          thread.summary,
          thread.nextStep,
          ...thread.messages.map((message) => message.text),
        ]
          .join(" ")
          .toLowerCase();

        return !needle || searchableText.includes(needle);
      })
      .sort((a, b) => a.minutesOld - b.minutesOld);
  }, [activeView, query, selectedTeam, status]);

  const selected = threads.find((thread) => thread.id === selectedId) ?? visibleThreads[0] ?? threads[0];
  const activeTeam = team.find((member) => member.owner === selectedTeam);
  const viewLabel = selectedTeam ? `${selectedTeam}'s queue` : views.find((view) => view.key === activeView)?.label;
  const urgent = threads.filter((thread) => thread.status === "Needs response" && thread.minutesOld < 720);

  function runPreviewSync() {
    setSyncState("syncing");
    window.setTimeout(() => setSyncState("complete"), 700);
  }

  function chooseView(view: ViewKey) {
    setActiveView(view);
    setSelectedTeam(null);
    const first = threads.find((thread) => matchesView(thread, view));
    if (first) {
      setSelectedId(first.id);
    }
  }

  function chooseTeam(owner: Owner) {
    setSelectedTeam(owner);
    setActiveView("auto");
    const first = threads.find((thread) => thread.owner === owner && matchesView(thread, "auto"));
    if (first) {
      setSelectedId(first.id);
    }
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <header className="flex h-14 items-center justify-between overflow-hidden border-b border-border bg-surface px-5">
        <div>
          <div className="text-base font-semibold">CreatorBoard</div>
          <div className="text-xs text-[#62594d]">Sample creator program board</div>
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded-md border border-border px-3 py-2 text-sm font-semibold" href="/setup">
            Setup
          </Link>
          <button
            className="w-36 rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-surface"
            onClick={runPreviewSync}
            type="button"
          >
            {syncState === "syncing" ? "Syncing..." : "Sync preview"}
          </button>
        </div>
      </header>

      <div className="grid h-[calc(100vh-3.5rem)] overflow-hidden lg:grid-cols-[248px_minmax(0,1fr)_432px]">
        <aside className="h-full overflow-y-auto border-r border-border bg-[#ece8dd] p-4">
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#756b5c]">
              Inbox views
            </div>
            <p className="mt-1 text-sm leading-5 text-[#62594d]">
              Built around creator work, not generic engagement.
            </p>
          </div>

          <nav className="space-y-1">
            {views.map((view) => {
              const count = threads.filter((thread) => matchesView(thread, view.key)).length;
              const isActive = !selectedTeam && activeView === view.key;

              return (
                <button
                  className={`group w-full rounded-md px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-foreground text-surface" : "hover:bg-surface"
                  }`}
                  key={view.key}
                  onClick={() => chooseView(view.key)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{view.label}</span>
                    <span className={`text-xs ${isActive ? "text-[#d8d2c5]" : "text-[#756b5c]"}`}>
                      {count}
                    </span>
                  </span>
                  <span className={`mt-0.5 block text-xs ${isActive ? "text-[#d8d2c5]" : "text-[#756b5c]"}`}>
                    {view.hint}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-border pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756b5c]">
              Team load
            </div>
            <div className="space-y-1 text-sm">
              {team.map((member) => (
                <div
                  className={`rounded-md px-3 py-2 transition-colors ${
                    selectedTeam === member.owner ? "bg-accent-soft" : "hover:bg-surface"
                  }`}
                  key={member.owner}
                >
                  <button className="w-full text-left" onClick={() => chooseTeam(member.owner)} type="button">
                    <span className="flex items-center justify-between">
                      <span>{member.owner}</span>
                      <strong className={member.owner === "Nick" ? "text-accent" : ""}>{member.total}</strong>
                    </span>
                    <span className="mt-0.5 block text-xs text-[#756b5c]">{member.estimate} estimated</span>
                  </button>
                  <Link
                    className="mt-1 inline-block text-xs font-semibold text-accent underline"
                    href={`/team/${member.owner.toLowerCase()}`}
                  >
                    Open workload
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-surface p-4">
            {syncState === "complete" ? (
              <div className="mb-3 rounded-md border border-[#d8d2c5] bg-surface-muted px-3 py-2 text-sm text-[#62594d]">
                Preview sync refreshed. Real Instagram sync comes after OAuth, encrypted token storage, and webhooks are wired.
              </div>
            ) : null}

            <div className="mb-4 grid gap-3 xl:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
              <div className="border border-border bg-background p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                  Today
                </div>
                <div className="mt-2 text-2xl font-semibold">{urgent.length} urgent creator replies</div>
                <p className="mt-1 text-sm leading-5 text-[#62594d]">
                  Payment, access, and uploaded-content review should happen first.
                </p>
              </div>
              <Metric label="Need team action" value="213" />
              <Metric label="Content/edit" value="38" />
              <Metric label="Payment" value="12" />
            </div>

            {activeTeam ? (
              <div className="mb-4 grid grid-cols-3 gap-3">
                <MiniPanel label="Assigned work" value={`${activeTeam.total} threads`} />
                <MiniPanel label="AI estimate" value={activeTeam.estimate} />
                <MiniPanel label="Main bottleneck" value={activeTeam.focus} />
              </div>
            ) : null}

            <div className="grid min-h-[86px] grid-cols-[minmax(560px,1fr)_520px] items-end gap-3">
              <div className="w-[650px] max-w-[650px]">
                <h1 className="text-2xl font-semibold">{viewLabel}</h1>
                <p className="mt-1 w-[650px] text-sm leading-6 text-[#62594d]">
                  Every row is a creator thread with a clear owner, status, and
                  next step. Open the thread to see context and draft a reply.
                </p>
              </div>
              <div className="grid w-[520px] grid-cols-[330px_180px] gap-2">
                <input
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search names, handles, or message text"
                  value={query}
                />
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-medium"
                  onChange={(event) => setStatus(event.target.value as Status | "All statuses")}
                  value={status}
                >
                  {statuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-b border-border bg-surface-muted px-4 py-2">
            <div className="grid grid-cols-[1.2fr_150px_100px_1.35fr_80px] gap-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#756b5c]">
              <button className="text-left">Creator</button>
              <button className="text-left">Status</button>
              <button className="text-left">Owner</button>
              <button className="text-left">Next step</button>
              <button className="text-left">Last</button>
            </div>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {visibleThreads.map((thread) => (
              <ThreadRow
                isSelected={selected.id === thread.id}
                key={thread.id}
                onSelect={() => setSelectedId(thread.id)}
                thread={thread}
              />
            ))}

            {visibleThreads.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#62594d]">
                No creator threads match this view.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-l border-border bg-surface p-4">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar id={selected.id} name={selected.creator} size="lg" src={selected.avatarUrl} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{selected.creator}</h2>
                    <span className="shrink-0 text-sm text-[#62594d]">@{selected.handle}</span>
                  </div>
                  <div className="truncate text-sm text-[#62594d]">
                    {selected.followers} followers · {selected.source}
                  </div>
                </div>
              </div>
              <div className="max-w-[160px] shrink-0">
                <StatusPill status={selected.status} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-surface">
                Save action
              </button>
              <Link
                className="min-w-0 rounded-md border border-border px-3 py-2 text-center text-sm font-semibold"
                href={`/creators/${selected.handle}`}
              >
                Creator page
              </Link>
            </div>

            <div className="mt-3 border border-border bg-background px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#756b5c]">
                Summary + next step
              </div>
              <ul className="mt-1 space-y-1 text-sm leading-5">
                <li>
                  <span className="font-semibold">Summary:</span> {shortSummary(selected)}
                </li>
                <li>
                  <span className="font-semibold">Action:</span> {shortAction(selected)}
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between">
              <h3 className="font-semibold">Thread context</h3>
              <span className="text-xs font-semibold text-[#756b5c]">{selected.messages.length} messages</span>
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md border border-border bg-background p-4 pr-3">
              {selected.messages.map((message) => (
                <MessageBubble key={`${message.time}-${message.text}`} message={message} query={query} />
              ))}
            </div>
          </div>

          <div className="mt-3 min-w-0 border-t border-border pt-3">
            <label className="text-sm font-semibold" htmlFor="reply">
              Draft reply
            </label>
            <textarea
              className="mt-2 h-20 w-full resize-none rounded-md border border-border bg-background p-3 text-sm leading-5 outline-none focus:border-accent"
              defaultValue="Thanks for the note. I am checking this now and will get you the next step shortly."
              id="reply"
            />
            <button className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-surface">
              Send Instagram reply
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function matchesView(thread: Thread, view: ViewKey) {
  if (view === "auto") {
    return !["Waiting on creator", "Saved", "Done"].includes(thread.status);
  }

  if (view === "response") {
    return thread.status === "Needs response" || thread.status === "Access needed";
  }

  if (view === "content") {
    return thread.status === "Content uploaded" || thread.status === "Edit needed";
  }

  if (view === "payments") {
    return thread.status === "Payment question";
  }

  if (view === "waiting") {
    return thread.status === "Waiting on creator";
  }

  if (view === "saved") {
    return thread.status === "Saved";
  }

  return thread.status === "Done";
}

function ThreadRow({
  isSelected,
  onSelect,
  thread,
}: {
  isSelected: boolean;
  onSelect: () => void;
  thread: Thread;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`group relative grid w-full grid-cols-[1.2fr_150px_100px_1.35fr_80px] gap-4 px-4 py-4 text-left outline-none transition-colors duration-75 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0 ${
        isSelected ? "bg-accent-soft ring-1 ring-inset ring-accent" : "hover:bg-surface"
      }`}
      onClick={onSelect}
      onMouseDown={onSelect}
      type="button"
    >
      <span
        className={`absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="flex min-w-0 items-center gap-3 pl-2">
        <Avatar id={thread.id} name={thread.creator} src={thread.avatarUrl} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{thread.creator}</div>
          <div className="truncate text-sm text-[#62594d]">
            @{thread.handle} · {thread.followers} followers · {thread.source}
          </div>
        </div>
      </div>
      <StatusPill status={thread.status} />
      <div className="text-sm font-semibold">{thread.owner}</div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{thread.nextStep}</div>
        <div className="mt-0.5 truncate text-xs text-[#756b5c]">{thread.lastMessage}</div>
      </div>
      <div className="text-sm text-[#62594d]">{thread.age}</div>
    </button>
  );
}

function Avatar({
  id,
  name,
  size = "md",
  src,
}: {
  id: number;
  name: string;
  size?: "md" | "lg";
  src?: string;
}) {
  const dimensions = size === "lg" ? "h-11 w-11" : "h-10 w-10";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      aria-label={`${name} profile photo`}
      className={`${dimensions} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border text-xs font-semibold text-[#4d4439]`}
      role="img"
      style={{
        backgroundColor: avatarColor(id),
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      {src ? <span className="sr-only">{initials}</span> : initials}
    </div>
  );
}

function avatarColor(id: number) {
  const colors = ["#f5d4c8", "#dceee5", "#d8e8ff", "#fff0bf", "#eadff8", "#e9e3d7"];
  return colors[id % colors.length];
}

function shortSummary(thread: Thread) {
  if (thread.status === "Payment question") return "Creator says payment not sent.";
  if (thread.status === "Content uploaded") return "Content uploaded, needs review.";
  if (thread.status === "Edit needed") return "Raw file needs a stronger hook.";
  if (thread.status === "Access needed") return "Creator needs gear or access.";
  if (thread.status === "Waiting on creator") return "Creator has the next step.";
  if (thread.status === "Saved") return "Thread pinned for later.";
  if (thread.status === "Done") return "No open action.";
  return "Creator needs a reply.";
}

function shortAction(thread: Thread) {
  if (thread.status === "Payment question") return "Check payment sheet, confirm amount.";
  if (thread.status === "Content uploaded") return "Review folder, choose usable clips.";
  if (thread.status === "Edit needed") return "Ask for one tighter opening.";
  if (thread.status === "Access needed") return "Get address, size, and email.";
  if (thread.status === "Waiting on creator") return "Wait, then follow up if needed.";
  if (thread.status === "Saved") return "Keep pinned.";
  if (thread.status === "Done") return "No action needed.";
  return "Reply with the next step.";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background p-4">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm font-medium text-[#62594d]">{label}</div>
    </div>
  );
}

function MiniPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#756b5c]">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function MessageBubble({ message, query }: { message: Message; query: string }) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm leading-6 ${
        message.side === "team" ? "ml-8 bg-[#dbe9ff]" : "mr-8 bg-surface-muted"
      }`}
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#756b5c]">
        {message.side} · {message.time}
      </div>
      <Highlight text={message.text} query={query} />
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();

  if (!needle) {
    return text;
  }

  const index = text.toLowerCase().indexOf(needle.toLowerCase());

  if (index === -1) {
    return text;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + needle.length);
  const after = text.slice(index + needle.length);

  return (
    <>
      {before}
      <mark className="rounded-sm bg-[#ffe38f] px-0.5 text-foreground">{match}</mark>
      {after}
    </>
  );
}

function StatusPill({ status }: { status: Status }) {
  const tone =
    status === "Needs response"
      ? "bg-accent-soft text-accent"
      : status === "Payment question"
        ? "bg-[#fff1c9] text-[#785600]"
        : status === "Content uploaded" || status === "Edit needed"
          ? "bg-[#dbe9ff] text-[#164a8a]"
          : status === "Waiting on creator"
            ? "bg-surface-muted text-[#62594d]"
            : status === "Access needed"
              ? "bg-[#e2f4e9] text-[#276144]"
              : status === "Saved"
                ? "bg-[#e9e4ff] text-[#58439a]"
                : "bg-surface-muted text-[#62594d]";

  return (
    <span className={`inline-flex h-7 max-w-full items-center truncate whitespace-nowrap rounded-full px-3 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}
