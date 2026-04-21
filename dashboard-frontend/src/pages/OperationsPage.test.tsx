import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import OperationsPage from "./OperationsPage";
import { API_BASE_URL } from "../services/api";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";

describe("OperationsPage", () => {
  it("renders incident records with typed columns", async () => {
    renderWithProviders(<OperationsPage type="incidents" />, { route: "/dashboard/incidents" });

    await screen.findByText("investigating");

    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("investigating")).toBeInTheDocument();
  });

  it("updates ticket status through the backend mutation seam", async () => {
    const user = userEvent.setup();
    let receivedStatus = "";
    let persistedStatus = "assigned";

    server.use(
      http.get(`${API_BASE_URL}/tickets`, () =>
        HttpResponse.json({
          data: [
            {
              id: "TK-1",
              title: "Dispatch field engineer",
              status: persistedStatus,
              team: "Ops",
              assignee: "Alex",
            },
          ],
        }),
      ),
      http.patch(`${API_BASE_URL}/tickets/:ticketId/status`, async ({ request, params }) => {
        const body = (await request.json()) as { status?: string };
        receivedStatus = body.status ?? "";
        persistedStatus = body.status ?? persistedStatus;

        return HttpResponse.json({
          id: params.ticketId,
          title: "Dispatch field engineer",
          status: body.status,
          team: "Ops",
          assignee: "Alex",
        });
      }),
    );

    renderWithProviders(<OperationsPage type="tickets" />, { route: "/dashboard/tickets" });

    await screen.findByText("Dispatch field engineer");

    const trigger = screen.getByLabelText("Update status for Dispatch field engineer");
    expect(trigger).toHaveTextContent("assigned");

    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "in-progress" }));

    await waitFor(() => {
      expect(receivedStatus).toBe("in-progress");
    });

    await waitFor(() => {
      expect(trigger).toHaveTextContent("in-progress");
    });
  });
});
