import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText("DebtClear")).toBeDefined();
  });

  it("renders the subtitle", () => {
    render(<App />);
    expect(
      screen.getByText("Full-stack debt tracker with dark fintech UI")
    ).toBeDefined();
  });
});
