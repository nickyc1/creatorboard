# CreatorBoard Deployment

CreatorBoard has two surfaces:

- Public marketing/legal pages.
- The private app at `/app.html`, backed by `server.js` for Instagram sync, reply sending, and login sessions.

GitHub Pages can host the public pages, but it cannot safely host the private app because the Meta access token must stay server-side.

## Recommended V1 Host

Use a Node host such as Render, Railway, Fly.io, or a small VPS.

Start command:

```bash
npm start
```

Required production environment variables:

```bash
PORT=8765
AUTH_REQUIRED=true
AUTH_ALLOWED_EMAILS=nick@raxdigital.com
AUTH_ALLOWED_DOMAINS=<team-email-domain>
AUTH_COOKIE_SECRET=<random 32+ byte secret>
RESEND_API_KEY=<resend key for login codes>
AUTH_EMAIL_FROM=CreatorBoard <login@creatorboard.io>
META_GRAPH_VERSION=v25.0
INSTAGRAM_GRAPH_BASE=https://graph.instagram.com
META_IG_ACCOUNT_ID=<instagram business account id>
META_ACCESS_TOKEN=<long-lived instagram token>
```

Optional local mode:

```bash
AUTH_REQUIRED=false npm start
```

## DNS

If the private app should live at `app.creatorboard.io`, keep GitHub Pages on `creatorboard.io` and point:

```text
Type: CNAME
Name: app
Value: <host-provided-domain>
```

If the private app should replace the root `creatorboard.io`, move the root DNS records from GitHub Pages to the Node host according to that host's instructions.

## Security Notes

- Never expose `META_ACCESS_TOKEN` in HTML, JavaScript, or GitHub Pages.
- The app is protected only when `AUTH_REQUIRED=true`.
- Login codes are short-lived and sessions are stored in server memory for this V1. Use persistent session storage before scaling to multiple server instances.
- Put the app behind HTTPS before using it with live creator data.
