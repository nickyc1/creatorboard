# Instagram OAuth setup design

CreatorBoard uses Instagram Business Login to connect an Instagram professional
account before the inbox can sync creator conversations.

## Phase 1 scope

- Start the Instagram OAuth flow from the server.
- Validate the OAuth `state` value on return.
- Redirect the user back to setup with a clear status.
- Do not exchange, store, or expose access tokens until encrypted persistence is
  added.

## Data handled

- OAuth `state`: random, short-lived, stored in an HTTP-only cookie.
- OAuth `code`: received by the callback route and discarded after validation in
  this phase.
- Access tokens: not requested or stored in this phase.

## Trust boundaries

- Browser to CreatorBoard server.
- CreatorBoard server to Instagram OAuth.
- Instagram OAuth back to CreatorBoard callback.

## Controls

- CSRF protection: `/api/meta/start` generates a random state and the callback
  requires an exact match.
- Cookie handling: state cookie is HTTP-only, SameSite=Lax, Secure on HTTPS, and
  expires after 10 minutes.
- Redirect handling: redirects only target local CreatorBoard setup URLs.
- Token safety: no tokens are sent to the browser, written to logs, or stored in
  localStorage.
- Setup success UI: the browser only receives coarse connection status and
  never renders OAuth codes, token values, or token-exchange details.
- Secrets: app secret is not committed. The later token exchange must use a
  Render secret environment variable.

## Follow-up before real sync

- Add database tables for organizations, Instagram accounts, token metadata, and
  sync jobs.
- Exchange the authorization code server-side with the Instagram app secret.
- Encrypt long-lived access tokens at rest.
- Add audit events for connect, disconnect, refresh, and sync.
- Add a deauthorize endpoint and complete data deletion callback handling.
