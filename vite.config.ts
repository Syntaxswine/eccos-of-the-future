import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";

const SITE_PLACEHOLDER_DATABASE_ID = "00000000-0000-4000-8000-000000000000";
const { d1, r2 } = hostingConfig;

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  assets: { binding: "ASSETS", html_handling: "none" },
  d1_databases: d1
    ? [{ binding: d1, database_name: "eccos-of-the-future", database_id: SITE_PLACEHOLDER_DATABASE_ID }]
    : [],
  r2_buckets: r2 ? [{ binding: r2, bucket_name: "eccos-of-the-future" }] : []
};

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    plugins: [
      vinext(),
      sites(),
      cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] }, config: localBindingConfig })
    ]
  };
});
