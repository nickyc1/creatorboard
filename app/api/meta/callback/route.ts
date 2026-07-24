import { NextRequest, NextResponse } from "next/server";

const STATE_COOKIE = "cb_meta_oauth_state";

function setupRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/setup", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, "", {
    maxAge: 0,
    path: "/",
  });

  return response;
}

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (error) {
    return setupRedirect(request, {
      instagram: "error",
      message: "Instagram authorization was cancelled or rejected.",
    });
  }

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return setupRedirect(request, {
      instagram: "state-error",
      message: "The Instagram login response could not be verified. Please try again.",
    });
  }

  if (!code) {
    return setupRedirect(request, {
      instagram: "missing-code",
      message: "Instagram did not return an authorization code. Please try again.",
    });
  }

  return setupRedirect(request, {
    instagram: "code-received",
    message: "Instagram returned an authorization code. Token storage is the next build step.",
  });
}
