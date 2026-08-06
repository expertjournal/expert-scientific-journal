import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected routes
const protectedRoutes = {
  author: ["/author"],
  editor: ["/editor"],
  reviewer: ["/reviewer"],
  reader: ["/reader"],
  admin: ["/admin"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("expert_token")?.value;

  // Check if route is protected
  const isProtectedRoute = Object.values(protectedRoutes).flat().some((route) =>
    pathname.startsWith(route)
  );

  // If trying to access protected route without authentication
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isProtectedRoute) {
    try {
      let userRole = "author";
      const parts = token.split(".");

      if (parts.length === 3) {
        const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(payloadBase64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const decoded = JSON.parse(jsonPayload);
        userRole = (decoded.role || decoded.user_metadata?.role || "author").toLowerCase();

        // Check JWT Expiration
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          const loginUrl = new URL("/login", request.url);
          loginUrl.searchParams.set("redirect", pathname);
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete("expert_token");
          return response;
        }
      }

      // Role-based access control directly from verified JWT token payload
      if (protectedRoutes.author.some((route) => pathname.startsWith(route))) {
        if (userRole !== "author" && userRole !== "admin") {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }

      if (protectedRoutes.editor.some((route) => pathname.startsWith(route))) {
        if (userRole !== "editor" && userRole !== "admin") {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }

      if (protectedRoutes.reviewer.some((route) => pathname.startsWith(route))) {
        if (userRole !== "reviewer" && userRole !== "editor" && userRole !== "admin") {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }

      if (protectedRoutes.admin.some((route) => pathname.startsWith(route))) {
        if (userRole !== "admin") {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
      }
    } catch (e) {
      console.warn("Middleware Edge JWT validation error:", e);
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};