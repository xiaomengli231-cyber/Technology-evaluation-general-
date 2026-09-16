/// <reference types="@cloudflare/workers-types" />

declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
