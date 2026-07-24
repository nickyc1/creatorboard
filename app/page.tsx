import Link from "next/link";

const phaseItems = [
  "Phase 1: foundation",
  "Phase 2: auth",
  "Phase 3: database and RLS",
  "Phase 4: Instagram integration",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#191510]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-[#d8d2c5] pb-5">
          <div className="text-xl font-semibold">CreatorBoard</div>
          <Link
            className="rounded-full border border-[#d8d2c5] px-4 py-2 text-sm font-medium text-[#6c6254] hover:border-[#191510]"
            href="/onboarding"
          >
            Open product shell
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#9c3328]">
              Phase 0 locked
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal sm:text-6xl">
              Stop losing creator money in Instagram DMs.
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-[#5d554a]">
              CreatorBoard turns creator conversations into a compact action inbox:
              who needs a reply, who owns it, what happened, and what to do next.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                className="rounded-md bg-[#191510] px-5 py-3 text-sm font-semibold text-[#fffdf8]"
                href="/onboarding"
              >
                View onboarding
              </Link>
              <Link
                className="rounded-md border border-[#d8d2c5] px-5 py-3 text-sm font-semibold"
                href="/dashboard"
              >
                View inbox
              </Link>
            </div>
          </div>

          <div className="border border-[#d8d2c5] bg-[#fffdf8] p-6">
            <h2 className="text-lg font-semibold">Build order</h2>
            <div className="mt-5 space-y-3">
              {phaseItems.map((item) => (
                <div
                  className="flex items-center justify-between border border-[#e4ded2] bg-[#f7f5ef] px-4 py-3"
                  key={item}
                >
                  <span className="font-medium">{item}</span>
                  <span className="text-sm text-[#6c6254]">queued</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-[#6c6254]">
              Instagram OAuth, webhooks, token storage, AI summaries, payments,
              and account deletion require Rafter review before code.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
