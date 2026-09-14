import { headers } from "next/headers";
import { getIndexNowKey } from "@/lib/indexnow";

export async function GET() {
  // Make this a request-time route: the deployment key is runtime
  // configuration and must not be frozen into a build-time 404 response.
  await headers();
  const key = getIndexNowKey();
  if (!key) return new Response("Not found", { status: 404 });

  return new Response(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
