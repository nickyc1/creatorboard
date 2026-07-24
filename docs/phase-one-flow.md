# CreatorBoard Phase 1 Flow

CreatorBoard is not a generic social inbox. The job is to move a creator from “interested in working together” to “usable ad assets are live, paid, and improving growth.”

## Phase 1 Product Loop

1. Connect Instagram
   - Brand connects one Instagram professional account.
   - CreatorBoard imports DM threads with message history, creator handle, profile metadata, and thread source.
   - Webhooks keep new messages current after initial backfill.

2. Triage the creator inbox
   - Threads are grouped by operational status: needs response, offer needed, content uploaded, edit needed, payment question, waiting on creator, saved, completed.
   - Each thread gets an owner, summary, next step, estimated effort, and draft reply.
   - Search covers every message in each thread, not just the latest message.

3. Turn interest into an offer
   - Team can choose an offer template:
     - commission only, such as 3% of ad spend
     - base plus commission
     - long-form base fee
     - reshoot or bonus terms
   - Offer tracks deliverables, due date, usage rights, payment timing, and approval status.

4. Collect creator assets
   - V1 uses Google Drive links because Patriot Crew already works there.
   - Creator profile stores the upload folder, creator upload link, team edit link, and asset status.
   - Native uploads come later after storage limits, virus scanning, and deletion workflows are designed.

5. Review, edit, and launch videos
   - Each creator profile shows raw uploads, edited cuts, post status, and live ad status.
   - Team can mark videos as editing, ready for creator, posted, live ad, or rejected.
   - CreatorBoard should eventually verify posts through Instagram content APIs or a manual confirmation fallback.

6. Track payment and performance
   - V1 tracks payment records and spend/performance imported from sheets.
   - Later phases can sync Meta ad spend, Shopify revenue, and payment tools.
   - Notifications can fire when a video is uploaded, posted, crosses spend/view thresholds, or has a payment due.

## V1 Screens

- Setup: connect Instagram, invite team, import roster, add Drive folder, add payment sheet.
- Action inbox: compact queue of creator DMs needing work.
- Team page: one person’s workload, estimated time, status mix, and queue.
- Creator page: conversation, offer, upload workflow, videos, payments, and performance.

## Security Design Notes

- OAuth and IG access tokens stay server-side only.
- Tokens must be encrypted at rest and never written to localStorage or exposed in client components.
- All app data is scoped by organization and account.
- Team access should use role-based permissions before multi-customer launch.
- Webhooks must verify Meta signatures, reject replayed requests where possible, and log delivery failures without storing unnecessary secrets.
- Native file uploads are not in Phase 1. Google Drive links are safer until storage, malware scanning, file limits, and data deletion are implemented.
- Payments are tracking-only in Phase 1. No automated payouts until payment authorization and audit flows exist.
- Data deletion must remove account tokens, imported messages, summaries, creator records, and generated drafts for the requesting organization.
