import { describe, expect, it } from "vitest";
import { MockApiClient, type TokenStore } from "@/lib/api";

function memoryTokenStore(): TokenStore {
  let token: string | null = null;
  return {
    get: () => token,
    set: (value) => {
      token = value;
    },
    clear: () => {
      token = null;
    },
  };
}

async function loginAs(client: MockApiClient, email: string): Promise<MockApiClient> {
  const result = await client.login({ email, password: "password123" });
  expect(result.ok).toBe(true);
  return client;
}

async function firstResourceId(client: MockApiClient): Promise<string> {
  const result = await client.listResources();
  if (!result.ok) throw new Error("expected resources to load");
  return result.value[0].id;
}

describe("MockApiClient auth", () => {
  it("logs in with seeded credentials", async () => {
    const client = new MockApiClient({ tokenStore: memoryTokenStore() });
    const result = await client.login({
      email: "admin@example.com",
      password: "password123",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const client = new MockApiClient({ tokenStore: memoryTokenStore() });
    const result = await client.login({ email: "admin@example.com", password: "wrongpassword" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("MockApiClient appointments", () => {
  it("creates and lists an appointment", async () => {
    const client = await loginAs(
      new MockApiClient({ tokenStore: memoryTokenStore() }),
      "user@example.com",
    );
    const resourceId = await firstResourceId(client);

    const create = await client.createAppointment({
      resourceId,
      date: "2026-10-10",
      startTime: "14:00",
      endTime: "15:00",
    });
    expect(create.ok).toBe(true);

    const list = await client.listAppointments();
    expect(list.ok).toBe(true);
    if (list.ok) expect(list.value).toHaveLength(1);
  });

  it("rejects overlapping appointments", async () => {
    const client = await loginAs(
      new MockApiClient({ tokenStore: memoryTokenStore() }),
      "user@example.com",
    );
    const resourceId = await firstResourceId(client);
    const input = {
      resourceId,
      date: "2026-10-10",
      startTime: "14:00",
      endTime: "15:00",
    };

    const first = await client.createAppointment(input);
    expect(first.ok).toBe(true);

    const second = await client.createAppointment({
      ...input,
      startTime: "14:30",
      endTime: "15:30",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("CONFLICT");
  });

  it("frees a slot after cancel", async () => {
    const client = await loginAs(
      new MockApiClient({ tokenStore: memoryTokenStore() }),
      "user@example.com",
    );
    const resourceId = await firstResourceId(client);
    const input = {
      resourceId,
      date: "2026-10-10",
      startTime: "14:00",
      endTime: "15:00",
    };

    const first = await client.createAppointment(input);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const cancel = await client.cancelAppointment(first.value.id);
    expect(cancel.ok).toBe(true);

    const again = await client.createAppointment(input);
    expect(again.ok).toBe(true);
  });

  it("reschedules an appointment", async () => {
    const client = await loginAs(
      new MockApiClient({ tokenStore: memoryTokenStore() }),
      "user@example.com",
    );
    const resourceId = await firstResourceId(client);

    const create = await client.createAppointment({
      resourceId,
      date: "2026-10-10",
      startTime: "14:00",
      endTime: "15:00",
    });
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const reschedule = await client.rescheduleAppointment(create.value.id, {
      date: "2026-10-11",
      startTime: "10:00",
      endTime: "11:00",
    });
    expect(reschedule.ok).toBe(true);
    if (reschedule.ok) {
      expect(reschedule.value.startAtLocal.startsWith("2026-10-11T10:00")).toBe(true);
    }
  });
});

describe("MockApiClient authorization", () => {
  it("blocks non-admin from listing users", async () => {
    const client = await loginAs(
      new MockApiClient({ tokenStore: memoryTokenStore() }),
      "user@example.com",
    );
    const result = await client.listUsers();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
  });

  it("allows admin to list users", async () => {
    const client = await loginAs(
      new MockApiClient({ tokenStore: memoryTokenStore() }),
      "admin@example.com",
    );
    const result = await client.listUsers();
    expect(result.ok).toBe(true);
  });

  it("blocks non-admin from creating resources", async () => {
    const client = await loginAs(
      new MockApiClient({ tokenStore: memoryTokenStore() }),
      "user@example.com",
    );
    const result = await client.createResource({ name: "Room C" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
  });
});
