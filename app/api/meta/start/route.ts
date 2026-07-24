import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_INSTAGRAM_CLIENT_ID = "1561224192303691";
const STATE_COOKIE = "cb_meta_oauth_state";
const INSTAGRAM_OAUTH_URL = "https://www.instagram.com/oauth/authorize";
const SCOPES = ["instagram_business_basic", "instagram_business_manage_messages"];

function getAppOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

export function GET(request: NextRequest) {
  const origin = getAppOrigin(request);
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI || `${origin}/api/meta/callback`;
  const clientId =
    process.env.INSTAGRAM_CLIENT_ID ||
    process.env.META_APP_ID ||
    DEFAULT_INSTAGRAM_CLIENT_ID;
  const state = randomBytes(24).toString("base64url");

  const authorizeUrl = new URL(INSTAGRAM_OAUTH_URL);
  authorizeUrl.searchParams.set("force_reauth", "true");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", SCOPES.join(","));
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: origin.startsWith("https://"),
  });

  return response;
}
