# CreatorBoard V1 Security Notes

## Current Design

- Local Node connector serves the static app and keeps Meta credentials server-side.
- Browser never receives `META_ACCESS_TOKEN`.
- Connector exposes only:
  - `GET /api/instagram/status`
  - `POST /api/instagram/sync`
  - `POST /api/instagram/send`
  - static files from this folder
- Imported creator sheets, spend data, and synced DMs are stored in browser `localStorage`.
- Local testing should read the Meta token from a password manager or environment variable; the token is not committed to disk.

## Data Classification

- Creator names, handles, emails, phone numbers, PayPal emails, and shipping addresses: PII.
- DM message text: user content and business-sensitive communications.
- Spend, ROAS, purchases, payouts: business-confidential data.
- Meta access token: credential, must stay out of frontend code and source control.

## V1 Controls

- No token in browser JavaScript.
- Send-message requests accept only a numeric Instagram-scoped recipient ID from an already-synced conversation and a capped plain-text message.
- No external fetchers from user-supplied URLs.
- Static file serving blocks path traversal by resolving paths under the app directory.
- Instagram sync request body is JSON-only and capped at 16KB.
- Instagram conversation/message limits are capped server-side.
- Dynamic browser rendering escapes imported and synced text before `innerHTML`.
- CSV export prefixes formula-shaped cells to reduce spreadsheet formula injection risk.

## Accepted V1 Risks

- No human login yet. This is a local prototype intended for one operator on one machine.
- Local browser storage is not encrypted. Do not use with real creator PII on a shared computer.
- No webhook signature verification yet because V1 only pulls messages. Add signature verification before accepting Meta webhooks.
- Reply sends are not yet protected by a human login because this is a local one-operator prototype.
