import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
import { renderWithProviders } from "../test/render";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

describe("Dashboard", () => {
  it("renders dashboard data, charts, and filters devices", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });

    expect(screen.getByText("Infrastructure Dashboard")).toBeInTheDocument();
    await screen.findByText("Edge Router 1");

    expect(screen.getByText("Device availability snapshot")).toBeInTheDocument();
    expect(screen.getByText("Current workflow volume")).toBeInTheDocument();
    expect(screen.getAllByText("Online").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alarms").length).toBeGreaterThan(0);

    const search = screen.getByPlaceholderText(/search device/i);
    fireEvent.change(search, { target: { value: "Print Hub" } });

    await waitFor(() => {
      expect(screen.getByText("Print Hub")).toBeInTheDocument();
      expect(screen.queryByText("Edge Router 1")).not.toBeInTheDocument();
    });
  });
});
