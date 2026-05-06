import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/verify",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify",
  "/api/cars",
  "/api/auctions",
  "/_next",
  "/favicon.ico",
  "/logo.png",
  "/images",
];

const adminPaths = ["/admin", "/api/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check auth token
  const token = request.cookies.get("token")?.value;
  const user = token ? verifyToken(token) : null;

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check admin access
  if (adminPaths.some((path) => pathname.startsWith(path))) {
    if (user.role !== "ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
