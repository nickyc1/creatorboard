import Link from "next/link";

const setupSteps = [
  {
    title: "Connect Instagram",
    detail: "Pull DMs from the account your creator team already uses.",
    state: "Current",
  },
  {
    title: "Import creators",
    detail: "Upload the roster so active creators jump ahead of the noise.",
    state: "Next",
  },
  {
    title: "Invite your team",
    detail: "Assign replies, edits, payments, and access follow-up.",
    state: "Later",
  },
];

const outcomes = [
  ["213", "threads need a reply"],
  ["38", "waiting on edits or uploads"],
  ["12", "payment questions found"],
];

const checks = [
  "Instagram account is professional or business",
  "Facebook Page is connected to the Instagram account",
  "You have admin access for the brand account",
];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-7">
        <Link className="text-lg font-semibold" href="/">
          CreatorBoard
        </Link>
        <Link className="text-sm font-medium text-accent underline" href="/dashboard">
          Skip to demo inbox
        </Link>
      </header>

      <section className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[680px]">
            <div className="mb-10 grid grid-cols-3 gap-1">
              {setupSteps.map((step, index) => (
                <div
                  className={`h-1 rounded-full ${
                    index === 0 ? "bg-accent" : index === 1 ? "bg-cb-blue" : "bg-border"
                  }`}
                  key={step.title}
                />
              ))}
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              Set up your first board
            </p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-normal">
              Connect the inbox your creators already use.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[#62594d]">
              Start with Instagram. CreatorBoard will turn the first sync into a
              prioritized queue for replies, content, payments, and team follow-up.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {setupSteps.map((step) => (
                <div className="border border-border bg-surface p-4" key={step.title}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold">{step.title}</span>
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-xs text-[#62594d]">
                      {step.state}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[#62594d]">{step.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border border-border bg-surface p-5">
              <h2 className="font-semibold">Before you connect</h2>
              <div className="mt-4 space-y-3">
                {checks.map((check) => (
                  <div className="flex gap-3 text-sm text-[#4d463d]" key={check}>
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cb-green text-xs font-bold text-surface">
                      ✓
                    </span>
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="flex h-12 flex-1 items-center justify-center rounded-md bg-foreground px-5 text-sm font-semibold text-surface"
                href="/dashboard"
              >
                Continue with Instagram
              </Link>
              <button className="h-12 flex-1 rounded-md border border-border bg-surface px-5 text-sm font-semibold">
                Import roster CSV
              </button>
            </div>
          </div>
        </div>

        <aside className="hidden items-center justify-center bg-[#e7e3fb] px-10 lg:flex">
          <div className="w-full max-w-md">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#5a4aa0]">
              First sync preview
            </p>
            <div className="space-y-4">
              {outcomes.map(([value, label]) => (
                <div className="border border-[#cfc8ee] bg-surface p-5 shadow-sm" key={label}>
                  <div className="text-3xl font-semibold">{value}</div>
                  <div className="mt-1 text-sm text-[#62594d]">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-[#5a4f7a]">
              We are not building a generic social inbox. The first useful screen
              is the creator action list your team can work through today.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
