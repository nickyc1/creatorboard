import Link from "next/link";

type SetupSearchParams = {
  instagram?: string | string[];
  message?: string | string[];
};

type SetupPageProps = {
  searchParams?: Promise<SetupSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function instagramConnectionCopy(status: string | undefined, message: string | undefined) {
  if (status === "code-received") {
    return {
      tone: "success",
      label: "Code received",
      title: "Instagram handed CreatorBoard an authorization code.",
      detail:
        message ||
        "The OAuth handshake is working. Next we add encrypted token storage so sync can run from the live app.",
    };
  }

  if (status === "error" || status === "state-error" || status === "missing-code") {
    return {
      tone: "error",
      label: "Needs attention",
      title: "Instagram connection needs another try.",
      detail:
        message ||
        "The login response could not be verified. Start again from this setup page.",
    };
  }

  return {
    tone: "default",
    label: "Next",
    title: "Connect the Instagram account CreatorBoard should manage.",
    detail:
      "Use the Patriot Crew Instagram professional account or an admin account that can grant access. CreatorBoard keeps the OAuth exchange server-side.",
  };
}

const baseSteps = [
  {
    title: "Connect Instagram",
    status: "Next",
    detail: "OAuth will connect one Instagram professional account and keep the token encrypted server-side.",
  },
  {
    title: "Invite the team",
    status: "Ready",
    detail: "Add Alex, Mia, Nick, or anyone else who owns creator replies and content review.",
  },
  {
    title: "Import creator roster",
    status: "Ready",
    detail: "Start with a CSV or Google Sheet so DMs can match to existing creators.",
  },
  {
    title: "Connect Drive workflow",
    status: "Planned",
    detail: "Use existing Drive folders for raw uploads, edited cuts, and creator approval links.",
  },
  {
    title: "Add payment sheet",
    status: "Planned",
    detail: "Track base fees, ad-spend commission, pending payouts, and payment questions.",
  },
];

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = (await searchParams) ?? {};
  const instagramStatus = firstParam(params.instagram);
  const statusMessage = firstParam(params.message);
  const connection = instagramConnectionCopy(instagramStatus, statusMessage);
  const steps = baseSteps.map((step, index) =>
    index === 0 ? { ...step, status: connection.label } : step,
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
        <Link className="text-base font-semibold" href="/dashboard">
          CreatorBoard
        </Link>
        <Link className="rounded-md border border-border px-3 py-2 text-sm font-semibold" href="/dashboard">
          Back to inbox
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Setup</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">
            Connect the pieces that turn DMs into creator ads.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#62594d]">
            Phase 1 starts with Instagram. The rest of the setup exists so the inbox can
            understand offers, uploads, payments, and ownership instead of becoming another
            message list.
          </p>

          <div
            className={
              "mt-8 border p-5 " +
              (connection.tone === "success"
                ? "border-[#7dbb85] bg-[#f4fbf3]"
                : connection.tone === "error"
                  ? "border-[#d88c80] bg-[#fff5f2]"
                  : "border-border bg-surface")
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                  Instagram account
                </p>
                <h2 className="mt-2 text-xl font-semibold">{connection.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#62594d]">
                  {connection.detail}
                </p>
                <p className="mt-3 text-xs leading-5 text-[#746b60]">
                  No access tokens are put in the browser. Full sync turns on after encrypted
                  token storage is added.
                </p>
              </div>
              <Link
                className="shrink-0 rounded-md bg-foreground px-4 py-3 text-center text-sm font-semibold text-surface"
                href="/api/meta/start"
              >
                Connect Instagram
              </Link>
            </div>
          </div>

          <div className="mt-8 divide-y divide-border border border-border bg-surface">
            {steps.map((step, index) => (
              <div className="grid gap-4 p-5 sm:grid-cols-[36px_1fr_90px]" key={step.title}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
                  {index + 1}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#62594d]">{step.detail}</p>
                </div>
                <div className="self-start rounded-full bg-accent-soft px-3 py-1 text-center text-xs font-semibold text-accent">
                  {step.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="h-fit border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Phase 1 guardrails</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#62594d]">
            <li>Instagram only until the core workflow is fast.</li>
            <li>Google Drive links before native uploads.</li>
            <li>Payment tracking before automated payouts.</li>
            <li>OAuth tokens encrypted server-side only.</li>
            <li>AI drafts are suggestions, not auto-sent replies.</li>
          </ul>
          <Link
            className="mt-6 block rounded-md bg-foreground px-4 py-3 text-center text-sm font-semibold text-surface"
            href="/api/meta/start"
          >
            Connect Instagram
          </Link>
        </aside>
      </section>
    </main>
  );
}
