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
    let receivedNoteBody = "";
    let persistedStatus = "assigned";
    let notes = [
      {
        id: "NOTE-1",
        ticketId: "TK-1",
        body: "Field engineer dispatch approved and waiting on travel confirmation.",
        authorName: "NOC Lead",
        createdAt: "2026-04-08T10:05:00.000Z",
      },
    ];

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
      http.get(`${API_BASE_URL}/tickets/:ticketId/notes`, () => HttpResponse.json({ data: notes })),
      http.post(`${API_BASE_URL}/tickets/:ticketId/notes`, async ({ request, params }) => {
        const body = (await request.json()) as { body?: string };
        receivedNoteBody = body.body ?? "";
        const nextNote = {
          id: "NOTE-2",
          ticketId: String(params.ticketId),
          body: body.body ?? "",
          authorName: "Operator",
          createdAt: "2026-04-08T10:10:00.000Z",
        };
        notes = [...notes, nextNote];
        return HttpResponse.json(nextNote);
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

    await user.click(screen.getByRole("button", { name: "Open notes for Dispatch field engineer" }));
    await screen.findByText("Field engineer dispatch approved and waiting on travel confirmation.");
    await user.type(screen.getByLabelText("Add Comment"), "Vendor advised a 30-minute ETA.");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    await waitFor(() => {
      expect(receivedNoteBody).toBe("Vendor advised a 30-minute ETA.");
    });

    await waitFor(() => {
      expect(screen.getByText("Vendor advised a 30-minute ETA.")).toBeInTheDocument();
    });
  });
});
