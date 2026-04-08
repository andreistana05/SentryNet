import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OperationsPage from "./OperationsPage";
import { renderWithProviders } from "../test/render";

describe("OperationsPage", () => {
  it("renders incident records with typed columns", async () => {
    renderWithProviders(<OperationsPage type="incidents" />, { route: "/dashboard/incidents" });

    await screen.findByText("Branch outage");

    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Next Action")).toBeInTheDocument();
    expect(screen.getByText("Branch outage")).toBeInTheDocument();
  });
});
