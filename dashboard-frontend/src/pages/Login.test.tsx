import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Login from "./Login";
import { renderWithProviders } from "../test/render";

describe("Login", () => {
  it("shows an API error for invalid credentials", async () => {
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "bad@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText("Login failed")).toBeInTheDocument();
    });
  });
});
