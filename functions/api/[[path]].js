// vibeapp-proxy — CF Pages Function
// Routes /api/* to AWS backend, injects API key server-side.
// Secrets set via CF Pages dashboard: LIVEGRID_API_KEY, API_BASE

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Validate env vars are present
  if (!env.LIVEGRID_API_KEY || !env.API_BASE) {
    return new Response(
      JSON.stringify({ error: "Missing env vars: LIVEGRID_API_KEY or API_BASE" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build upstream URL — strip /api prefix
  const upstreamPath = url.pathname.replace(/^\/api/, "") + url.search;
  const upstream = env.API_BASE.replace(/\/$/, "") + upstreamPath;

  try {
    const resp = await fetch(upstream, {
      method: request.method,
      headers: {
        "X-API-Key": env.LIVEGRID_API_KEY,
        "Accept": "application/json",
        "Content-Type": request.headers.get("Content-Type") || "application/json",
      },
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    });

    const headers = new Headers(resp.headers);
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(resp.body, { status: resp.status, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Upstream fetch failed", detail: err.message }),
      { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}
