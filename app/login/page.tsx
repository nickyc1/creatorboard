import Link from "next/link";

const allowed = ["nick@raxdigital.com", "Patriot Crew team emails"];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_0.8fr]">
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link className="text-xl font-semibold" href="/">
            CreatorBoard
          </Link>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Creator program workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">
            Log in to manage creator replies, assets, and payouts.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#62594d]">
            This preview is locked to approved team emails while we finish the production
            auth and Instagram connection flow.
          </p>

          <form className="mt-8 space-y-3">
            <label className="block text-sm font-semibold" htmlFor="email">
              Work email
            </label>
            <input
              className="h-12 w-full rounded-md border border-border bg-surface px-3 text-base outline-none focus:border-accent"
              defaultValue="nick@raxdigital.com"
              id="email"
              type="email"
            />
            <Link
              className="block rounded-md bg-foreground px-4 py-3 text-center text-sm font-semibold text-surface"
              href="/dashboard"
            >
              Continue to CreatorBoard
            </Link>
          </form>

          <div className="mt-6 rounded-md border border-border bg-surface p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756b5c]">
              Preview access
            </div>
            <ul className="mt-2 space-y-1 text-sm text-[#62594d]">
              {allowed.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <aside className="hidden border-l border-border bg-surface p-10 lg:flex lg:items-center">
        <div className="w-full space-y-4">
          {[
            ["213", "creator threads need team action"],
            ["38", "uploaded clips need review"],
            ["12", "payment questions are waiting"],
          ].map(([value, label]) => (
            <div className="border border-border bg-background p-6" key={label}>
              <div className="text-4xl font-semibold">{value}</div>
              <div className="mt-2 text-sm text-[#62594d]">{label}</div>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
