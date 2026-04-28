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
    expect(screen.getByRole("link", { name: /view open alarms/i })).toHaveAttribute("href", "/dashboard/alarms");
    expect(screen.getByRole("link", { name: /view open incidents/i })).toHaveAttribute(
      "href",
      "/dashboard/incidents",
    );
    expect(screen.getByRole("link", { name: /view active tickets/i })).toHaveAttribute("href", "/dashboard/tickets");
    expect(screen.getByRole("link", { name: /view problem records/i })).toHaveAttribute(
      "href",
      "/dashboard/problems",
    );

    const search = screen.getByPlaceholderText(/search device/i);
    fireEvent.change(search, { target: { value: "Print Hub" } });

    await waitFor(() => {
      expect(screen.getByText("Print Hub")).toBeInTheDocument();
      expect(screen.queryByText("Edge Router 1")).not.toBeInTheDocument();
    });
  });

  it("collapses and expands the live overview panels", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });

    await screen.findByText("Edge Router 1");
    expect(screen.getByText("CPU threshold exceeded")).toBeInTheDocument();

    const inventoryToggle = screen.getByRole("button", { name: /collapse live inventory/i });
    fireEvent.click(inventoryToggle);

    expect(inventoryToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Edge Router 1")).not.toBeVisible();

    fireEvent.click(inventoryToggle);

    expect(inventoryToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Edge Router 1")).toBeInTheDocument();

    const workQueuesToggle = screen.getByRole("button", { name: /collapse live work queues/i });
    fireEvent.click(workQueuesToggle);

    expect(workQueuesToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("CPU threshold exceeded")).not.toBeVisible();

    fireEvent.click(workQueuesToggle);

    expect(workQueuesToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("CPU threshold exceeded")).toBeInTheDocument();
  });
});
