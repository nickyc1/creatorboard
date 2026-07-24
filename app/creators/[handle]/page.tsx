import Link from "next/link";
import { getCreatorByHandle } from "@/lib/creatorboard-data";

type CreatorPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { handle } = await params;
  const creator = getCreatorByHandle(handle);

  if (!creator) {
    return (
      <main className="min-h-screen bg-background p-8 text-foreground">
        <Link className="text-sm font-semibold underline" href="/dashboard">
          Back to dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-semibold">Creator not found</h1>
      </main>
    );
  }

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

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border border-border bg-surface p-5">
          <div>
            <p className="text-sm text-[#62594d]">@{creator.handle}</p>
            <h1 className="mt-1 text-4xl font-semibold">{creator.name}</h1>
            <p className="mt-2 text-sm text-[#62594d]">
              {creator.followers} followers · {creator.inbox} · owned by {creator.owner}
            </p>
          </div>
          <div className="rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent">
            {creator.status}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <Panel title="Offer and terms">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Offer" value={creator.offer.structure} />
                <Field label="Deliverables" value={creator.offer.deliverables} />
                <Field label="Usage rights" value={creator.offer.usage} />
                <Field label="Payment timing" value={creator.offer.paymentTiming} />
              </div>
            </Panel>

            <Panel title="Upload workflow">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Status" value={creator.upload.status} />
                <Field label="Team folder" value={creator.upload.driveFolder} />
                <Field label="Creator upload" value={creator.upload.creatorLink} />
              </div>
            </Panel>

            <Panel title="Sponsored videos">
              <div className="overflow-hidden border border-border">
                <div className="grid grid-cols-[1.4fr_150px_100px_100px_100px] gap-3 bg-surface-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#756b5c]">
                  <div>Video</div>
                  <div>Status</div>
                  <div>Spend</div>
                  <div>Views</div>
                  <div>Sales</div>
                </div>
                {creator.videos.map((video) => (
                  <div
                    className="grid grid-cols-[1.4fr_150px_100px_100px_100px] gap-3 border-t border-border px-4 py-3 text-sm"
                    key={video.title}
                  >
                    <div>
                      <div className="font-semibold">{video.title}</div>
                      <div className="text-xs text-[#62594d]">{video.postedAt ?? "Not posted yet"}</div>
                    </div>
                    <div>{video.status}</div>
                    <div>{video.spend}</div>
                    <div>{video.views}</div>
                    <div>{video.sales}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Payments">
              <div className="grid gap-3">
                {creator.payments.map((payment) => (
                  <div className="grid grid-cols-[1fr_130px_110px_90px] gap-3 border border-border p-3 text-sm" key={payment.item}>
                    <strong>{payment.item}</strong>
                    <span>{payment.status}</span>
                    <span>{payment.amount}</span>
                    <span className="text-[#62594d]">{payment.date}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <aside className="grid max-h-[calc(100vh-7rem)] grid-rows-[auto_minmax(0,1fr)_auto] border border-border bg-surface p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756b5c]">
                Summary + next step
              </div>
              <ul className="mt-2 space-y-1 text-sm leading-5">
                <li>
                  <strong>Summary:</strong> {creator.summary}
                </li>
                <li>
                  <strong>Action:</strong> {creator.nextStep}
                </li>
              </ul>
            </div>

            <div className="mt-4 min-h-0 overflow-y-auto rounded-md border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Thread context</h2>
                <span className="text-xs text-[#62594d]">{creator.messages.length} messages</span>
              </div>
              <div className="space-y-3">
                {creator.messages.map((message) => (
                  <div
                    className={`max-w-[86%] rounded-md p-3 text-sm leading-6 ${
                      message.side === "team" ? "ml-auto bg-[#d8e8ff]" : "bg-surface-muted"
                    }`}
                    key={`${message.time}-${message.text}`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#756b5c]">
                      {message.side === "team" ? "Team" : "Creator"} · {message.time}
                    </div>
                    {message.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <label className="text-sm font-semibold" htmlFor="reply">
                Draft reply
              </label>
              <textarea
                className="mt-2 h-24 w-full resize-none rounded-md border border-border bg-background p-3 text-sm leading-5 outline-none focus:border-accent"
                defaultValue="Thanks for the note. I am checking this now and will get you the next step shortly."
                id="reply"
              />
              <button className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-surface">
                Send Instagram reply
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#756b5c]">
        {label}
      </div>
      <div className="mt-1 text-sm leading-6">{value}</div>
    </div>
  );
}
