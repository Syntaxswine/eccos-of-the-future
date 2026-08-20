import { DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES, handleImageOptimization } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const EXPECTED_DIGEST = "2374cc16aec7bdf37792d86a3f82cec4dbc0643675e7fa12488553d5c0ee176b";
const CREATE_COUNTER = `CREATE TABLE IF NOT EXISTS ecco_countersign_totals (
  id INTEGER PRIMARY KEY,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
)`;
const INCREMENT_COUNTER = `INSERT INTO ecco_countersign_totals (id, accepted_count, updated_at)
VALUES (1, 1, ?)
ON CONFLICT(id) DO UPDATE SET
  accepted_count = accepted_count + 1,
  updated_at = excluded.updated_at
RETURNING accepted_count`;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }
  });
}

async function recordAcceptedCountersign(request: Request, env: Env) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return json({ accepted: false }, 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > 512) {
    return json({ accepted: false }, 413);
  }
  let digest: unknown;
  try {
    ({ digest } = await request.json() as { digest?: unknown });
  } catch {
    return json({ accepted: false }, 400);
  }
  if (digest !== EXPECTED_DIGEST) return json({ accepted: false }, 403);

  await env.DB.prepare(CREATE_COUNTER).run();
  await env.DB.prepare(INCREMENT_COUNTER).bind(new Date().toISOString()).first();
  return json({ accepted: true }, 202);
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/countersign-success") {
      if (request.method !== "POST") return json({ accepted: false }, 405);
      return recordAcceptedCountersign(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        }
      }, allowedWidths);
    }

    if (url.pathname === "/") {
      return env.ASSETS.fetch(new Request(new URL("/index-static.html", request.url), request));
    }

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    return handler.fetch(request, env, ctx);
  }
};

export default worker;
