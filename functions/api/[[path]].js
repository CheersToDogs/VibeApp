// vibeapp-proxy Worker
// Sits in front of the AWS API — injects X-API-Key, enforces CORS.
// Deploy to the vibeapp Pages project as a Functions worker.
// Secret LIVEGRID_API_KEY is set via CF dashboard (never in code).

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Only proxy /api/* paths
  if (!url.pathname.startsWith("/api/")) {
    return new Response("Not found", { status: 404 });
  }

  // Strip /api prefix to build upstream path
  const upstreamPath = url.pathname.replace(/^\/api/, "") + url.search;
  const upstream = env.API_BASE + upstreamPath;

  const proxied = new Request(upstream, {
    method: request.method,
    headers: {
      "X-API-Key": env.LIVEGRID_API_KEY,
      "Content-Type": request.headers.get("Content-Type") || "application/json",
      "Accept": "application/json",
    },
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
  });

  const resp = await fetch(proxied);

  // Pass through with CORS headers
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(resp.body, {
    status: resp.status,
    headers,
  });
}
