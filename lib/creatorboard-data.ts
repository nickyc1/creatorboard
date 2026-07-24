export type TeamOwner = "Alex" | "Mia" | "Nick";

export type CreatorStatus =
  | "Needs response"
  | "Offer needed"
  | "Content uploaded"
  | "Edit needed"
  | "Payment question"
  | "Waiting on creator"
  | "Live";

export type CreatorMessage = {
  side: "creator" | "team";
  time: string;
  text: string;
};

export type CreatorProfile = {
  id: string;
  name: string;
  handle: string;
  followers: string;
  inbox: "Primary" | "General" | "Request";
  owner: TeamOwner;
  status: CreatorStatus;
  effortMinutes: number;
  summary: string;
  nextStep: string;
  offer: {
    structure: string;
    deliverables: string;
    usage: string;
    paymentTiming: string;
  };
  upload: {
    status: string;
    driveFolder: string;
    creatorLink: string;
  };
  videos: {
    title: string;
    status: "Editing" | "Ready for creator" | "Posted" | "Needs review";
    postedAt?: string;
    spend?: string;
    views?: string;
    sales?: string;
  }[];
  payments: {
    item: string;
    status: "Paid" | "Pending" | "Needs review";
    amount: string;
    date: string;
  }[];
  messages: CreatorMessage[];
};

export const teamMembers = [
  {
    owner: "Alex" as const,
    role: "Creator replies",
    total: 18,
    estimate: "3h 10m",
    focus: "Payment follow-ups and access requests",
  },
  {
    owner: "Mia" as const,
    role: "Content review",
    total: 9,
    estimate: "1h 45m",
    focus: "Uploaded clips and edit approvals",
  },
  {
    owner: "Nick" as const,
    role: "Unassigned triage",
    total: 42,
    estimate: "4h 20m",
    focus: "New creators, offer questions, and stale replies",
  },
];

export const creatorProfiles: CreatorProfile[] = [
  {
    id: "micahmoves",
    name: "Micah Rowe",
    handle: "micahmoves",
    followers: "51.8k",
    inbox: "Primary",
    owner: "Alex",
    status: "Payment question",
    effortMinutes: 18,
    summary: "Creator says payment not sent.",
    nextStep: "Check payment sheet, confirm amount, reply with expected timing.",
    offer: {
      structure: "3% of ad spend from approved videos plus $150 for long-form cuts.",
      deliverables: "Two raw short-form hooks and one optional YouTube-style long take.",
      usage: "Brand can edit, whitelist, and run partnership ads from approved posts.",
      paymentTiming: "Monthly commission payout after spend reconciliation.",
    },
    upload: {
      status: "Second content batch uploaded. Patriot team needs to review.",
      driveFolder: "Google Drive / Creators / Micah Rowe",
      creatorLink: "Upload link ready",
    },
    videos: [
      {
        title: "Flag tee backyard hook",
        status: "Posted",
        postedAt: "Jun 28",
        spend: "$8,420",
        views: "118k",
        sales: "$31.4k",
      },
      {
        title: "Family BBQ raw cut",
        status: "Needs review",
        spend: "$0",
        views: "-",
        sales: "-",
      },
    ],
    payments: [
      { item: "June commission", status: "Needs review", amount: "$252.60", date: "Jul 1" },
      { item: "Long-form base fee", status: "Paid", amount: "$150.00", date: "Jun 21" },
    ],
    messages: [
      { side: "creator", time: "Mon", text: "Sent the second batch. Let me know if it works." },
      { side: "team", time: "Tue", text: "Got it. We will review and get payment queued." },
      { side: "creator", time: "2h", text: "I still have not seen the PayPal payment come through." },
    ],
  },
  {
    id: "averylane-fit",
    name: "Avery Lane",
    handle: "averylane.fit",
    followers: "84.2k",
    inbox: "General",
    owner: "Nick",
    status: "Needs response",
    effortMinutes: 12,
    summary: "Creator asks whether YouTube cut or IG cut is preferred.",
    nextStep: "Reply that IG is first priority and YouTube can go in same Drive folder.",
    offer: {
      structure: "3% of ad spend on approved creator ads.",
      deliverables: "Three raw vertical videos, one intro hook per video.",
      usage: "Brand can edit and run as Meta partnership ads.",
      paymentTiming: "Commission paid monthly after Meta spend is closed.",
    },
    upload: {
      status: "Waiting for final raw clips.",
      driveFolder: "Google Drive / Creators / Avery Lane",
      creatorLink: "Upload link ready",
    },
    videos: [
      { title: "Gym mirror first try-on", status: "Ready for creator", spend: "$0", views: "-", sales: "-" },
      { title: "Phone selfie hook", status: "Editing", spend: "$0", views: "-", sales: "-" },
    ],
    payments: [{ item: "Commission", status: "Pending", amount: "3% of spend", date: "Monthly" }],
    messages: [
      { side: "team", time: "Yesterday", text: "Send raw clips in Drive when ready." },
      { side: "creator", time: "34m", text: "Can I send the YouTube cut too or just IG?" },
    ],
  },
  {
    id: "jordanpike-co",
    name: "Jordan Pike",
    handle: "jordanpike.co",
    followers: "126k",
    inbox: "Primary",
    owner: "Mia",
    status: "Content uploaded",
    effortMinutes: 22,
    summary: "Creator uploaded four clips and a long take.",
    nextStep: "Review folder, choose usable hooks, and mark whether editing is needed.",
    offer: {
      structure: "$250 base plus 3% of approved ad spend.",
      deliverables: "Four raw short-form clips and one long take.",
      usage: "Brand can edit into ads and request one revision.",
      paymentTiming: "Base paid on upload. Commission paid monthly.",
    },
    upload: {
      status: "Four clips in Drive, awaiting brand review.",
      driveFolder: "Google Drive / Creators / Jordan Pike",
      creatorLink: "Upload link ready",
    },
    videos: [
      { title: "Garage product pitch", status: "Needs review", spend: "$0", views: "-", sales: "-" },
      { title: "Truck bed hook", status: "Editing", spend: "$0", views: "-", sales: "-" },
    ],
    payments: [{ item: "Base fee", status: "Pending", amount: "$250.00", date: "On approval" }],
    messages: [
      { side: "creator", time: "5h", text: "Uploaded four hooks and the long take." },
      { side: "team", time: "Now", text: "We are reviewing now and will confirm which ones move to edits." },
    ],
  },
  {
    id: "mirastoneugc",
    name: "Mira Stone",
    handle: "mirastoneugc",
    followers: "22.7k",
    inbox: "Request",
    owner: "Mia",
    status: "Edit needed",
    effortMinutes: 28,
    summary: "Raw file is uploaded but hook is too slow.",
    nextStep: "Ask for one more hook with product visible in the first two seconds.",
    offer: {
      structure: "$100 base plus performance bonus after testing.",
      deliverables: "One product-first raw video and two hook options.",
      usage: "Brand can edit and run for paid social for 90 days.",
      paymentTiming: "Base paid after usable files are uploaded.",
    },
    upload: {
      status: "Needs revised opener.",
      driveFolder: "Google Drive / Creators / Mira Stone",
      creatorLink: "Upload link ready",
    },
    videos: [{ title: "Try-on mirror hook", status: "Editing", spend: "$0", views: "-", sales: "-" }],
    payments: [{ item: "Base fee", status: "Pending", amount: "$100.00", date: "After revised hook" }],
    messages: [
      { side: "team", time: "4d", text: "Can you upload the raw file in the folder?" },
      { side: "creator", time: "3d", text: "The raw file is in the folder. Let me know if you need another hook." },
    ],
  },
];

export function getCreatorByHandle(handle: string) {
  return creatorProfiles.find((creator) => creator.handle === handle || creator.id === handle);
}

export function getTeamMember(member: string) {
  return teamMembers.find((teamMember) => teamMember.owner.toLowerCase() === member.toLowerCase());
}

export function getTeamCreators(member: TeamOwner) {
  return creatorProfiles.filter((creator) => creator.owner === member);
}
