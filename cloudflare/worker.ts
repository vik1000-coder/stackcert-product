type AssetFetcher = {
  fetch(request: Request): Promise<Response>;
};

type Env = {
  ASSETS: AssetFetcher;
  STACKCERT_API_ORIGIN?: string;
};

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incomingUrl = new URL(request.url);
    if (incomingUrl.pathname === "/openapi.json" || incomingUrl.pathname === "/api" || incomingUrl.pathname.startsWith("/api/")) {
      return proxyApiRequest(request, env, incomingUrl);
    }
    return withStaticSecurityHeaders(await env.ASSETS.fetch(request));
  },
};

function withStaticSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.sentry.io https://*.ingest.sentry.io https://stackcert-api-oaw2bwdgyq-uc.a.run.app",
    "upgrade-insecure-requests",
  ].join("; "));
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function proxyApiRequest(request: Request, env: Env, incomingUrl: URL): Promise<Response> {
  const apiOrigin = normalizeOrigin(env.STACKCERT_API_ORIGIN);
  if (!apiOrigin) {
    return jsonResponse({ error: "StackCert API origin is not configured" }, 502);
  }

  const targetUrl = new URL(request.url);
  targetUrl.protocol = apiOrigin.protocol;
  targetUrl.hostname = apiOrigin.hostname;
  targetUrl.port = apiOrigin.port;
  targetUrl.username = "";
  targetUrl.password = "";

  const headers = forwardHeaders(request.headers, incomingUrl);
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const response = await fetch(targetUrl.toString(), init);
    const responseHeaders = new Headers(response.headers);
    for (const header of HOP_BY_HOP_HEADERS) {
      responseHeaders.delete(header);
    }
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "stackcert_api_proxy_error",
        path: incomingUrl.pathname,
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
    return jsonResponse({ error: "StackCert API is unavailable" }, 502);
  }
}

function forwardHeaders(source: Headers, incomingUrl: URL): Headers {
  const headers = new Headers(source);
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  headers.delete("host");
  headers.set("X-Forwarded-Host", incomingUrl.host);
  headers.set("X-Forwarded-Proto", incomingUrl.protocol.replace(":", ""));
  headers.set("X-StackCert-Edge", "cloudflare-workers");
  return headers;
}

function normalizeOrigin(origin: string | undefined): URL | null {
  if (!origin) {
    return null;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
