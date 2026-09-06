import { NextResponse, type NextRequest } from "next/server";
import { reportLegacyMigrationEvent } from "@/lib/migration-telemetry";
import { verifySessionToken, SESSION_COOKIE, LEGACY_SESSION_COOKIE } from "@/lib/session";
import {
  getAdminHost,
  getAppHost,
  getCanonicalHostForSurface,
  getPublicApexHost,
  isPublicAliasHost,
  isLegacyHost,
  isClientSurfacePath,
  isLikelyTokenPath,
  normalizeHost,
  resolveHostSurface,
  stripAdminPrefix,
} from "@/lib/host-routing";

function rewriteTo(request: NextRequest, pathname: string, headers: Headers) {
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = pathname;
  return NextResponse.rewrite(rewriteUrl, { request: { headers } });
}

function redirectToHost(
  request: NextRequest,
  targetHost: string,
  targetPathname: string
) {
  const url = request.nextUrl.clone();
  url.hostname = targetHost;
  url.pathname = targetPathname;
  return NextResponse.redirect(url, { status: 308 });
}

export async function middleware(request: NextRequest) {
  const originalPathname = request.nextUrl.pathname;
  const requestHost = normalizeHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  );
  const surface = resolveHostSurface(requestHost);
  let internalPathname = originalPathname;

  if (isLegacyHost(requestHost)) {
    reportLegacyMigrationEvent("legacy_host_redirect_used");
    return redirectToHost(request, getCanonicalHostForSurface(surface), originalPathname);
  }

  if (surface === "public") {
    if (isPublicAliasHost(requestHost)) {
      return redirectToHost(request, getPublicApexHost(), originalPathname);
    }
    if (originalPathname.startsWith("/admin")) {
      return redirectToHost(request, getAdminHost(), stripAdminPrefix(originalPathname));
    }
    // Historical product links occasionally used the marketing host plus the
    // internal segment. Move them straight to the canonical product origin.
    if (originalPathname === "/app" || originalPathname.startsWith("/app/")) {
      return redirectToHost(
        request,
        getAppHost(),
        originalPathname === "/app" ? "/" : originalPathname.slice(4)
      );
    }
    if (isClientSurfacePath(originalPathname)) {
      return redirectToHost(request, getAppHost(), originalPathname);
    }
  }

  if (surface === "admin") {
    if (isClientSurfacePath(originalPathname)) {
      return redirectToHost(request, getAppHost(), originalPathname);
    }

    // The admin surface owns the host root. Keep /admin URLs as an internal
    // implementation detail and never expose them in the browser address bar.
    if (originalPathname.startsWith("/admin")) {
      return redirectToHost(request, getAdminHost(), stripAdminPrefix(originalPathname));
    }

    if (!originalPathname.startsWith("/api")) {
      internalPathname =
        originalPathname === "/" ? "/admin" : `/admin${originalPathname}`;
    }
  }

  if (surface === "app") {
    // `/app` is an internal App Router segment, not a public URL. Canonicalize
    // old email/bookmark links before rewriting canonical paths internally.
    // This is deliberately a single external redirect, so legacy links never
    // enter the auth/onboarding guard under the wrong pathname.
    if (originalPathname === "/app" || originalPathname.startsWith("/app/")) {
      const canonicalUrl = request.nextUrl.clone();
      canonicalUrl.pathname = originalPathname === "/app" ? "/" : originalPathname.slice(4);
      return NextResponse.redirect(canonicalUrl, { status: 308 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", originalPathname);
    requestHeaders.set("x-auterim-surface", "app");
    if (originalPathname.startsWith("/api")) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const target = originalPathname === "/" ? "/app" : `/app${originalPathname}`;
    return rewriteTo(request, target, requestHeaders);
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
  if (surface === "admin") requestHeaders.set("x-auterim-surface", "admin");

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
    const canonicalToken = request.cookies.get(SESSION_COOKIE)?.value;
    const legacyToken = request.cookies.get(LEGACY_SESSION_COOKIE)?.value;
    const token = canonicalToken ?? legacyToken;
    const valid = token ? await verifySessionToken(token) : false;

    if (!valid) {
      if (legacyToken) reportLegacyMigrationEvent("migration_fallback_failed");
      const loginPath = surface === "admin" ? "/login" : "/admin/login";
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set("from", internalPathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!canonicalToken && legacyToken) {
      reportLegacyMigrationEvent("legacy_admin_cookie_used");
      const response = internalPathname !== originalPathname
        ? (() => {
          const rewriteUrl = request.nextUrl.clone();
          rewriteUrl.pathname = internalPathname;
          return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
        })()
        : NextResponse.next({ request: { headers: requestHeaders } });
      response.cookies.set(SESSION_COOKIE, legacyToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return response;
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)).*)"],
};
