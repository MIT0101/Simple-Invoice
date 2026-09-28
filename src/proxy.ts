import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional HTTP Basic Auth for the whole app, enabled only when both
 * BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are set.
 */
export function proxy(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return NextResponse.next();

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  // Compare both fields every time so timing does not reveal which one was wrong.
  const userMatches = safeEqual(credentials?.user ?? "", user);
  const passwordMatches = safeEqual(credentials?.password ?? "", password);
  if (credentials && userMatches && passwordMatches) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Invoices", charset="UTF-8"' },
  });
}

export const config = {
  // Everything except the container health check and static assets.
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};

function parseBasicAuth(header: string | null): { user: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

/** Constant-time string comparison (hashing first makes the lengths equal). */
function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
