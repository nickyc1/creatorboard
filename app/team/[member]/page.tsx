import Link from "next/link";
import { getTeamCreators, getTeamMember, type TeamOwner } from "@/lib/creatorboard-data";

type TeamPageProps = {
  params: Promise<{ member: string }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { member } = await params;
  const teamMember = getTeamMember(member);

  if (!teamMember) {
    return (
      <main className="min-h-screen bg-background p-8 text-foreground">
        <Link className="text-sm font-semibold underline" href="/dashboard">
          Back to dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-semibold">Team member not found</h1>
      </main>
    );
  }

  const creators = getTeamCreators(teamMember.owner as TeamOwner);
  const totalMinutes = creators.reduce((sum, creator) => sum + creator.effortMinutes, 0);

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

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <div className="border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Team queue</p>
            <h1 className="mt-2 text-3xl font-semibold">{teamMember.owner}</h1>
            <p className="mt-2 text-sm leading-6 text-[#62594d]">{teamMember.focus}</p>
          </div>
          <Metric label="Assigned" value={`${teamMember.total}`} />
          <Metric label="Sample queue" value={`${creators.length}`} />
          <Metric label="AI estimate" value={`${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m`} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="divide-y divide-border border border-border bg-surface">
            {creators.map((creator) => (
              <Link
                className="grid gap-3 p-5 hover:bg-surface-muted sm:grid-cols-[1fr_160px_120px]"
                href={`/creators/${creator.id}`}
                key={creator.id}
              >
                <div>
                  <div className="text-lg font-semibold">{creator.name}</div>
                  <div className="mt-1 text-sm text-[#62594d]">
                    @{creator.handle} · {creator.followers} followers · {creator.inbox}
                  </div>
                  <div className="mt-2 text-sm font-semibold">{creator.nextStep}</div>
                </div>
                <div className="self-start rounded-full bg-accent-soft px-3 py-1 text-center text-xs font-semibold text-accent">
                  {creator.status}
                </div>
                <div className="text-sm text-[#62594d]">{creator.effortMinutes} min</div>
              </Link>
            ))}
          </div>

          <aside className="h-fit border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold">Workload read</h2>
            <p className="mt-3 text-sm leading-6 text-[#62594d]">
              This page should become the manager view Ben opens to see who is buried,
              which creator replies are expensive to delay, and where to reassign work.
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <WorkItem label="Replies" value={creators.filter((c) => c.status === "Needs response").length} />
              <WorkItem label="Content review" value={creators.filter((c) => c.status.includes("uploaded") || c.status.includes("Edit")).length} />
              <WorkItem label="Payments" value={creators.filter((c) => c.status === "Payment question").length} />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm text-[#62594d]">{label}</div>
    </div>
  );
}

function WorkItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
