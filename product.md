# CreatorBoard Product Definition

## Problem

Creator program managers lose track of important creator conversations because Instagram DMs, comments, mentions, creator spreadsheets, payment notes, and team follow-ups are scattered across tools that were not built for team-based creator operations.

## Target User

In-house creator, partnership, or performance marketing managers at Shopify and ecommerce brands running 20-500 active creators for Meta partnership ads, UGC, ambassador programs, and affiliate campaigns.

## Wedge Feature

CreatorBoard is the fastest way to turn creator DMs into an action inbox: who needs a reply, who needs team action, what happened in the thread, and what to say next.

The first version launches with Instagram only. It should be better than Instagram DMs at three jobs:

1. Show every creator conversation that needs attention in one compact queue.
2. Summarize the thread and suggest the next step.
3. Let the team assign, resolve, search, and maintain creator status without living in a spreadsheet.

## Launch Scope

### In Scope

- Instagram Business account connection
- DM thread ingestion with full thread history
- Search across all message text
- Thread summaries and suggested next actions
- Statuses for creator ops, including needs reply, waiting on creator, content uploaded, editing needed, payment question, payment due, access needed, not working, and done
- Team ownership and assignment
- Creator roster import from CSV
- Basic creator profile fields: handle, name, follower count when available, program status, payment notes, next step
- Reply drafting, with programmatic Instagram reply if allowed by the approved API scopes
- Manual fallback links to open native Instagram threads where API reply is limited

### Out of Scope For Launch

- TikTok, YouTube, X, LinkedIn
- Full CRM or affiliate platform replacement
- Automated payments
- Ad performance reporting
- Google Sheets writeback
- Multi-brand agency dashboards beyond basic organization support
- Public API

## Monetization

Monthly subscription with an AppSumo Radar lifetime deal for early users.

Suggested launch pricing:

- Starter: $29/mo for 1 Instagram account and up to 100 tracked creators
- Pro: $79/mo for 3 connected accounts and up to 500 tracked creators
- Team: $199/mo for larger teams, more creators, and priority support
- AppSumo Radar LTD: $49-$99 one-time, Instagram-only, capped usage, early-user terms

## Legal Entity

RAX Digital LLC.

## Positioning Notes

CreatorBoard is not a generic social inbox. It is a creator program command center for teams that run paid creator partnerships, creator ads, UGC pipelines, affiliate offers, product gifting, and payment follow-up.

The product should feel like the opposite of bloated B2B software:

- compact
- fast
- plain-language statuses
- no decorative dashboards
- no fake AI magic
- no “engagement platform” fluff
- optimized for opening the app and knowing what to do in under 30 seconds

## Core Promise

Stop losing creator money in Instagram DMs.

CreatorBoard shows which creators need a reply, what they need, who owns it, and the next action to move the program forward.

## Phase Gate

Do not proceed to product build until Phase 1-3 are complete:

- Phase 1: domain, clean private GitHub repo, Vercel project, Supabase project, environment variable structure, 1Password vault
- Phase 2: Supabase auth with signup, login, logout, protected dashboard
- Phase 3: Postgres schema with RLS for organizations, memberships, platform connections, creators, inbox threads, inbox messages, assignments, and billing

Before writing Instagram OAuth, webhook, token storage, message ingestion, AI summaries, account deletion, or payment code, run `rafter-secure-design`.
