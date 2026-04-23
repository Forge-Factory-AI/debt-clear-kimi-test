import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DebtDialog, { type DebtFormData } from "./DebtDialog";
import type { Debt } from "@/lib/api";

function renderDialog(props: Partial<React.ComponentProps<typeof DebtDialog>> = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    debt: null,
    isLoading: false,
  };
  return render(<DebtDialog {...defaultProps} {...props} />);
}

const mockDebt: Debt = {
  id: "debt-1",
  name: "Car Loan",
  creditor: "Bank of America",
  originalAmount: 25000,
  remainingAmount: 15000,
  interestRate: 4.5,
  dueDate: new Date("2025-06-01T00:00:00Z"),
  isArchived: false,
  isPaidOff: false,
  paidOffAt: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  userId: "1",
};

describe("DebtDialog - Add Mode", () => {
  it("renders add dialog with correct title", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add New Debt")).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    renderDialog();
    expect(screen.getByLabelText(/debt name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/creditor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/original amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current balance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/interest rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /close dialog/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows validation errors on empty submit", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /add debt/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/creditor is required/i)).toBeInTheDocument();
    expect(screen.getByText(/original amount is required/i)).toBeInTheDocument();
  });

  it("shows validation error for negative original amount", async () => {
    renderDialog();
    const originalInput = screen.getByLabelText(/original amount/i);
    fireEvent.change(originalInput, { target: { value: "-100" } });
    fireEvent.blur(originalInput);

    await waitFor(() => {
      expect(screen.getByText(/must be a positive number/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for zero original amount", async () => {
    renderDialog();
    const originalInput = screen.getByLabelText(/original amount/i);
    fireEvent.change(originalInput, { target: { value: "0" } });
    fireEvent.blur(originalInput);

    await waitFor(() => {
      expect(screen.getByText(/must be a positive number/i)).toBeInTheDocument();
    });
  });

  it("defaults current balance to original amount on add", () => {
    renderDialog();
    const originalInput = screen.getByLabelText(/original amount/i);
    const remainingInput = screen.getByLabelText(/current balance/i) as HTMLInputElement;

    fireEvent.change(originalInput, { target: { value: "5000" } });
    expect(remainingInput.value).toBe("5000");
  });

  it("does not override current balance if already filled", () => {
    renderDialog();
    const originalInput = screen.getByLabelText(/original amount/i);
    const remainingInput = screen.getByLabelText(/current balance/i) as HTMLInputElement;

    fireEvent.change(remainingInput, { target: { value: "3000" } });
    fireEvent.change(originalInput, { target: { value: "5000" } });
    expect(remainingInput.value).toBe("3000");
  });

  it("submits form with valid data", async () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText(/debt name/i), { target: { value: "Test Debt" } });
    fireEvent.change(screen.getByLabelText(/creditor/i), { target: { value: "Test Bank" } });
    fireEvent.change(screen.getByLabelText(/original amount/i), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText(/interest rate/i), { target: { value: "5.5" } });
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: "2025-12-31" } });

    fireEvent.click(screen.getByRole("button", { name: /add debt/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const submitted = onSubmit.mock.calls[0][0] as DebtFormData;
    expect(submitted.name).toBe("Test Debt");
    expect(submitted.creditor).toBe("Test Bank");
    expect(submitted.originalAmount).toBe("10000");
    expect(submitted.remainingAmount).toBe("10000"); // defaulted
    expect(submitted.interestRate).toBe("5.5");
    expect(submitted.dueDate).toBe("2025-12-31");
  });

  it("does not render when open is false", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DebtDialog - Edit Mode", () => {
  it("renders edit dialog with correct title", () => {
    renderDialog({ debt: mockDebt });
    expect(screen.getByText("Edit Debt")).toBeInTheDocument();
  });

  it("pre-fills form with debt data", () => {
    renderDialog({ debt: mockDebt });

    expect((screen.getByLabelText(/debt name/i) as HTMLInputElement).value).toBe("Car Loan");
    expect((screen.getByLabelText(/creditor/i) as HTMLInputElement).value).toBe("Bank of America");
    expect((screen.getByLabelText(/original amount/i) as HTMLInputElement).value).toBe("25000");
    expect((screen.getByLabelText(/current balance/i) as HTMLInputElement).value).toBe("15000");
    expect((screen.getByLabelText(/interest rate/i) as HTMLInputElement).value).toBe("4.5");
    expect((screen.getByLabelText(/due date/i) as HTMLInputElement).value).toBe("2025-06-01");
  });

  it("submits updated data", async () => {
    const onSubmit = vi.fn();
    renderDialog({ debt: mockDebt, onSubmit });

    fireEvent.change(screen.getByLabelText(/debt name/i), { target: { value: "Updated Name" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const submitted = onSubmit.mock.calls[0][0] as DebtFormData;
    expect(submitted.name).toBe("Updated Name");
  });

  it("shows Save Changes button in edit mode", () => {
    renderDialog({ debt: mockDebt });
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
