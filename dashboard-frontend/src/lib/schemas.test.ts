import { describe, expect, it } from "vitest";
import { collectionEnvelopeSchema, deviceSchema, loginPayloadSchema, overviewSchema } from "./schemas";

describe("schemas", () => {
  it("normalizes device payloads from collection envelopes", () => {
    const schema = collectionEnvelopeSchema(deviceSchema);
    const parsed = schema.parse({
      data: [
        {
          id: "1",
          name: "Core Router",
          type: "Router",
          status: "online",
          ip_address: "10.0.0.1",
          last_seen: "2026-04-08T10:00:00.000Z",
        },
      ],
    });

    expect("data" in parsed && parsed.data[0]).toMatchObject({
      name: "Core Router",
      ipAddress: "10.0.0.1",
    });
  });

  it("parses overview counts safely", () => {
    const parsed = overviewSchema.parse({
      devices: { total: "12", online: "10" },
      alarms: { open: "2" },
      incidents: { open: "1" },
      tickets: { open: "4" },
      problems: { open: "1" },
    });

    expect(parsed.devices.total).toBe(12);
    expect(parsed.tickets.open).toBe(4);
  });

  it("rejects invalid login payloads", () => {
    expect(() => loginPayloadSchema.parse({ email: "not-an-email", password: "" })).toThrow();
  });
});
