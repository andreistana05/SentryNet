import { buildMetricCards, getProfileKey } from "./metrics";
import type { Device, DeviceMetricsPayload } from "../types/domain";

describe("metrics profiles", () => {
  it("assigns routers to the router-specific profile", () => {
    expect(getProfileKey("Router")).toBe("router");
    expect(getProfileKey("Edge Router")).toBe("router");
  });

  it("shows only router-relevant metric cards", () => {
    const device: Device = {
      id: "router-1",
      name: "Edge Router 1",
      type: "Router",
      status: "online",
      ipAddress: "10.0.0.1",
      lastSeen: "2026-04-14T11:00:00.000Z",
    };

    const payload: DeviceMetricsPayload = {
      metrics: [
        { name: "cpu_usage", value: 83, unit: "%", updatedAt: "2026-04-14T11:02:00.000Z" },
        { name: "packet_loss", value: 0, unit: "%", updatedAt: "2026-04-14T11:02:00.000Z" },
        { name: "latency", value: 3.5, unit: "ms", updatedAt: "2026-04-14T11:02:00.000Z" },
      ],
    };

    expect(buildMetricCards(device, payload).map((metric) => metric.label)).toEqual(["Packet Loss", "Latency"]);
  });
});
