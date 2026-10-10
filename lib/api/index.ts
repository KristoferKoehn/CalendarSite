import type { ApiClient } from "./client";
import { HttpApiClient } from "./http";
import { MockApiClient } from "./mock";
import { createTokenStore } from "./session";

export { ApiError } from "./errors";
export { err, ok, type Result } from "./result";
export { createTokenStore, type TokenStore } from "./session";
export type { ApiClient } from "./client";
export { HttpApiClient } from "./http";
export { MockApiClient } from "./mock";

export function createApiClient(): ApiClient {
  const tokenStore = createTokenStore();
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!useMock && baseUrl) {
    return new HttpApiClient({ baseUrl, tokenStore });
  }

  return new MockApiClient({ tokenStore });
}

let client: ApiClient | undefined;

export function getApiClient(): ApiClient {
  client ??= createApiClient();
  return client;
}
