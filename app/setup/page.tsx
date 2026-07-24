import Link from "next/link";

const steps = [
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

export default function SetupPage() {
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
            href="/dashboard"
          >
            Open action inbox
          </Link>
        </aside>
      </section>
    </main>
  );
}
