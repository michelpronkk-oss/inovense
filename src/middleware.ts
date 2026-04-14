import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import {
  getAdminHost,
  getPortalHost,
  isClientSurfacePath,
  isLikelyTokenPath,
  normalizeHost,
  resolveHostSurface,
  stripAdminPrefix,
} from "@/lib/host-routing";

function redirectToHost(
  request: NextRequest,
  targetHost: string,
  targetPathname: string
) {
  const url = request.nextUrl.clone();
  url.hostname = targetHost;
  url.pathname = targetPathname;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const originalPathname = request.nextUrl.pathname;
  const requestHost = normalizeHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  );
  const surface = resolveHostSurface(requestHost);
  let internalPathname = originalPathname;

  if (surface === "public") {
    if (originalPathname.startsWith("/admin")) {
      return redirectToHost(request, getAdminHost(), stripAdminPrefix(originalPathname));
    }
    if (isClientSurfacePath(originalPathname)) {
      return redirectToHost(request, getPortalHost(), originalPathname);
    }
  }

  if (surface === "admin") {
    if (isClientSurfacePath(originalPathname)) {
      return redirectToHost(request, getPortalHost(), originalPathname);
    }

    if (!originalPathname.startsWith("/api") && !originalPathname.startsWith("/admin")) {
      internalPathname =
        originalPathname === "/" ? "/admin" : `/admin${originalPathname}`;
    }
  }

  if (surface === "portal") {
    if (originalPathname.startsWith("/admin")) {
      return redirectToHost(request, getAdminHost(), stripAdminPrefix(originalPathname));
    }

    if (originalPathname.startsWith("/api")) {
      internalPathname = originalPathname;
    } else if (originalPathname === "/") {
      internalPathname = "/client";
    } else if (isLikelyTokenPath(originalPathname)) {
      internalPathname = `/client${originalPathname}`;
    } else if (isClientSurfacePath(originalPathname)) {
      internalPathname = originalPathname;
    } else {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Pass the current pathname as a request header so server components
  // (e.g. the admin layout) can detect the active route without a client hook.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", internalPathname);

  // Login page is publicly accessible - no session required
  if (internalPathname === "/admin/login") {
    if (internalPathname !== originalPathname) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = internalPathname;
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (internalPathname.startsWith("/admin")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const valid = token ? await verifySessionToken(token) : false;

    if (!valid) {
      const loginPath = surface === "admin" ? "/login" : "/admin/login";
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set("from", internalPathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (internalPathname !== originalPathname) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = internalPathname;
    return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on all navigable routes. Static assets, _next internals, and
  // files with extensions are excluded so they bypass the middleware.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)).*)"],
};
