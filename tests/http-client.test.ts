import { describe, expect, it } from "vitest";
import { HttpApiClient } from "@/lib/api/http";
import type { TokenStore } from "@/lib/api/session";

/**
 * The request path had no test coverage at all, which is how "Network error" survived as the only
 * message a failed connection could produce — it named no cause, so a blocked port, a wrong
 * certificate and a dead server were indistinguishable.
 */

/**
 * A store held in memory.
 *
 * Not `createTokenStore()`: that reads `window.localStorage`, and there is no window under the test
 * runner, so it silently reports no token. The first version of the bearer test passed an empty
 * header for exactly that reason and looked like a client bug.
 */
function memoryTokenStore(initial?: string): TokenStore {
  let token = initial ?? null;
  return {
    get: () => token,
    set: (next) => {
      token = next;
    },
    clear: () => {
      token = null;
    },
  };
}

function clientWith(fetchFn: typeof fetch, timeoutMs?: number) {
  const store = memoryTokenStore();
  return {
    client: new HttpApiClient({
      baseUrl: "https://api.example.test",
      tokenStore: store,
      fetchFn,
      timeoutMs,
    }),
    store,
  };
}

/** The shape a browser produces for a failed fetch: a TypeError whose cause carries the code. */
function fetchRejectingWith(code: string): typeof fetch {
  return (() =>
    Promise.reject(
      new TypeError("Failed to fetch", { cause: Object.assign(new Error(code), { code }) }),
    )) as unknown as typeof fetch;
}

describe("base URL handling", () => {
  /** Captures the URL a request actually goes to. */
  function captureClient(baseUrl: string) {
    let requested: string | undefined;
    const respond = ((url: string) => {
      requested = url;
      return Promise.resolve(
        new Response(JSON.stringify({ appointments: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch;
    const client = new HttpApiClient({ baseUrl, tokenStore: memoryTokenStore(), fetchFn: respond });
    return { client, get: () => requested };
  }

  it("keeps a path in the base URL", async () => {
    // The trap: `new URL("/auth/login", "https://host/api")` is `https://host/auth/login`, because
    // an absolute path replaces the base's path. That silently drops the prefix and would send
    // every request to the frontend instead of the API.
    const { client, get } = captureClient("https://host/api");
    await client.listAppointments();
    expect(get()).toBe("https://host/api/appointments");
  });

  it("does not double the slash when the base ends in one", async () => {
    const { client, get } = captureClient("https://host/api/");
    await client.listAppointments();
    expect(get()).toBe("https://host/api/appointments");
  });

  it("still works with no path in the base", async () => {
    const { client, get } = captureClient("https://host:4000");
    await client.listAppointments();
    expect(get()).toBe("https://host:4000/appointments");
  });

  it("keeps query parameters after the joined path", async () => {
    const { client, get } = captureClient("https://host/api");
    await client.listAppointments({ from: "2026-10-13", to: "2026-10-13" });
    expect(get()).toContain("https://host/api/appointments?");
    expect(get()).toContain("from=2026-10-13");
  });
});

describe("network failures", () => {
  it("names a refused connection rather than saying 'Network error'", async () => {
    const { client } = clientWith(fetchRejectingWith("ERR_CONNECTION_REFUSED"));
    const result = await client.me();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The whole point: this string tells you the port is closed, which is the campus-wifi
    // diagnosis. "Network error" did not.
    expect(result.error.message).toContain("ERR_CONNECTION_REFUSED");
    expect(result.error.message).not.toBe("Network error");
  });

  it("distinguishes a certificate problem from an unreachable host", async () => {
    const { client } = clientWith(fetchRejectingWith("ERR_CERT_AUTHORITY_INVALID"));
    const result = await client.me();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("ERR_CERT_AUTHORITY_INVALID");
  });

  it("distinguishes a DNS failure", async () => {
    const { client } = clientWith(fetchRejectingWith("ERR_NAME_NOT_RESOLVED"));
    const result = await client.me();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("ERR_NAME_NOT_RESOLVED");
  });

  it("reports no response at all when the deadline passes", async () => {
    // A network that drops packets silently rather than refusing: the request hangs, so the
    // deadline is the only thing that ends it.
    //
    // The stub has to honour the abort signal, because a real fetch does. The first version of
    // this test returned a promise that never settled and ignored the signal, so it hung for the
    // whole test timeout — which proved nothing about the client.
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      })) as unknown as typeof fetch;
    const { client } = clientWith(hanging, 50);

    const started = Date.now();
    const result = await client.me();
    const elapsed = Date.now() - started;

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("did not answer");
    expect(result.error.message).toContain("no response");
    // And it actually stopped waiting, rather than resolving when the promise did.
    expect(elapsed).toBeLessThan(2000);
  });

  it("still reports a plain failure when the cause carries nothing useful", async () => {
    const bare = (() => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch;
    const { client } = clientWith(bare);
    const result = await client.me();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("Failed to fetch");
  });

  it("survives a rejection that is not an Error at all", async () => {
    // fetch should not do this, but a stubbed one in a test or an unusual environment might.
    const weird = (() => Promise.reject("something odd")) as unknown as typeof fetch;
    const { client } = clientWith(weird);
    const result = await client.me();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("Could not reach the server");
  });
});

describe("successful requests", () => {
  it("sends the bearer token on a request that asks for authorisation", async () => {
    let seen: Headers | undefined;
    // A full user record, because the response schema is checked. An endpoint that returns a bare
    // array would be easier to fake but does not send the token — which is what this test is about.
    const account = {
      id: "3f0a1e6c-9b7d-4c2a-8e51-6a0d5f2b9c34",
      email: "a@example.com",
      role: "user",
      isAgent: false,
      emailVerifiedAt: "2026-10-13T00:00:00Z",
      displayName: null,
      birthMonth: null,
      birthDay: null,
      pronouns: null,
      jobTitle: null,
      bio: null,
      createdAt: "2026-10-01T00:00:00Z",
    };
    const respond = ((_url: string, init: RequestInit) => {
      seen = new Headers(init.headers);
      return Promise.resolve(
        new Response(JSON.stringify(account), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch;

    const { client, store } = clientWith(respond);
    store.set("a-token");
    const result = await client.me();
    expect(result.ok).toBe(true);
    expect(seen?.get("Authorization")).toBe("Bearer a-token");
  });

  it("reports a 204 as success rather than failing to parse an empty body", async () => {
    const noContent = (() =>
      Promise.resolve(new Response(null, { status: 204 }))) as unknown as typeof fetch;
    const { client } = clientWith(noContent);
    // forgotPassword is one of the 204 routes.
    const result = await client.forgotPassword({ email: "a@example.com" });
    expect(result.ok).toBe(true);
  });
});
