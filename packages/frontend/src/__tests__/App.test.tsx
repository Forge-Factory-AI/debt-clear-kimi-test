import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("App routing", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders login page at /login", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign in to your account")).toBeDefined();
    });
  });

  it("renders register page at /register", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Create a new account")).toBeDefined();
    });
  });

  it("redirects unauthenticated users from / to /login", async () => {
    mockFetch.mockRejectedValueOnce(new Error("no session"));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign in to your account")).toBeDefined();
    });
  });

  it("renders dashboard for authenticated users at /", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "1", email: "test@example.com", name: "Test", createdAt: "2024-01-01" },
      }),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Welcome, Test")).toBeDefined();
    });
  });
});
