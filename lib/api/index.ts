import type { ApiClient } from "./client";
import { HttpApiClient } from "./http";
import { createTokenStore } from "./session";

export { ApiError } from "./errors";
export { err, ok, type Result } from "./result";
export { createTokenStore, type TokenStore } from "./session";
export type { ApiClient } from "./client";
export { HttpApiClient } from "./http";

export function createApiClient(): ApiClient {
  const tokenStore = createTokenStore();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  return new HttpApiClient({ baseUrl, tokenStore });
}

let client: ApiClient | undefined;

export function getApiClient(): ApiClient {
  client ??= createApiClient();
  return client;
}
