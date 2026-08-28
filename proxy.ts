import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "student_guidance_session";

function withRequestedPath(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-teachix-requested-path",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return headers;
}

const PUBLIC_PATHS = new Set([
  "/login",
  "/teacher/login",
  "/register",
  "/forgot-password",
]);

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml";
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isDashboardApiPath(pathname: string) {
  return pathname === "/api/dashboard" || pathname.startsWith("/api/dashboard/");
}

function isMobilePath(pathname: string) {
  return pathname === "/mobile" || pathname.startsWith("/mobile/");
}

function hasSessionCookie(request: NextRequest) {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return Boolean(value && value.includes(".") && value.length > 40);
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const currentPath = request.nextUrl.pathname + request.nextUrl.search;

  if (currentPath && currentPath !== "/login") {
    loginUrl.searchParams.set("next", currentPath);
  }

  return NextResponse.redirect(loginUrl);
}

function unauthorizedApiResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "يجب تسجيل الدخول أولًا.",
      code: "UNAUTHENTICATED",
    },
    {
      status: 401,
    }
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || isPublicApi(pathname)) {
    return NextResponse.next();
  }

  if (isDashboardApiPath(pathname) && !hasSessionCookie(request)) {
    return unauthorizedApiResponse();
  }

  if (isDashboardPath(pathname) && !hasSessionCookie(request)) {
    return redirectToLogin(request);
  }

  if (isMobilePath(pathname) && !hasSessionCookie(request)) {
    return redirectToLogin(request);
  }

  return NextResponse.next({ request: { headers: withRequestedPath(request) } });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/dashboard/:path*",
    "/mobile",
    "/mobile/:path*",
  ],
};

