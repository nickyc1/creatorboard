# CreatorBoard Architecture Notes

## Current Phase

Phase 1 foundation has started. Phase 0 is captured in `product.md`.

## Build Rules

- Use the SaaS Playbook from `github.com/nickyc1/saas-playbook`.
- Launch with Instagram only.
- Keep `creatorboard.io` as the landing page.
- Use `app.creatorboard.io` for the SaaS app.
- Do not proceed to Instagram OAuth, webhooks, token storage, AI summaries, payments, or account deletion without `rafter-secure-design`.

## Planned Stack

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres with RLS
- Vercel
- Stripe

## Data Model Direction

CreatorBoard should support team-based creator operations from the start:

- organizations
- memberships
- platform connections
- inbox threads
- inbox messages
- creators
- assignments
- billing

Thread history is core product data because search, context, AI summaries, and suggested replies depend on it. Message data must be scoped by organization, protected by RLS, and covered by deletion and retention policies before launch.
