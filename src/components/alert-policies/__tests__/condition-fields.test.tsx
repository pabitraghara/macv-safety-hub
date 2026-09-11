import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionFields } from "../ConditionFields";
import type { AlertMatch } from "@/api/alert-policies";

// Radix Select relies on pointer-capture / scrollIntoView APIs that jsdom
// does not implement; polyfill them so the trigger can open in tests.
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function Wrapper({
  triggerType,
  initial,
}: {
  triggerType: "safety" | "speed_violation" | "alpr";
  initial: AlertMatch;
}) {
  const onChange = vi.fn();
  return {
    onChange,
    ui: (
      <ConditionFieldsControlled
        triggerType={triggerType}
        initial={initial}
        onChange={onChange}
      />
    ),
  };
}

// A tiny controlled wrapper so the component reflects state updates as a
// real parent would (ConditionFields itself derives UI state from `value`).
function ConditionFieldsControlled({
  triggerType,
  initial,
  onChange,
}: {
  triggerType: "safety" | "speed_violation" | "alpr";
  initial: AlertMatch;
  onChange: (next: AlertMatch) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ConditionFields
      triggerType={triggerType}
      value={value}
      onChange={(next: AlertMatch) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("ConditionFields - safety", () => {
  it("emits {} when 'All severities' is chosen", async () => {
    const user = userEvent.setup();
    const { onChange, ui } = Wrapper({
      triggerType: "safety",
      initial: { min_severity: "High" },
    });
    render(ui);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByText("All severities");
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("emits { min_severity: 'High' } when 'High' is chosen", async () => {
    const user = userEvent.setup();
    const { onChange, ui } = Wrapper({
      triggerType: "safety",
      initial: {},
    });
    render(ui);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByText("High and above");
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith({ min_severity: "High" });
  });
});

describe("ConditionFields - speed_violation", () => {
  it("emits {} for 'All violations'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ConditionFields
        triggerType="speed_violation"
        value={{ min_overspeed: 20 }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "All violations" }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("emits { min_overspeed: 15 } when threshold mode and typing 15", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ConditionFields
        triggerType="speed_violation"
        value={{}}
        onChange={onChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Overspeed threshold" }),
    );
    // Component is controlled: parent must feed the new value back for the
    // number input to appear (min_overspeed becomes NaN sentinel on switch).
    expect(onChange).toHaveBeenCalledWith({ min_overspeed: NaN });
    const lastCallValue =
      onChange.mock.calls[onChange.mock.calls.length - 1][0];
    rerender(
      <ConditionFields
        triggerType="speed_violation"
        value={lastCallValue}
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "15" } });

    expect(onChange).toHaveBeenLastCalledWith({ min_overspeed: 15 });
  });

  it("shows the provided error text", () => {
    render(
      <ConditionFields
        triggerType="speed_violation"
        value={{ min_overspeed: NaN }}
        onChange={vi.fn()}
        error="Enter a value of 0 or more."
      />,
    );
    expect(screen.getByText("Enter a value of 0 or more.")).toBeInTheDocument();
  });
});

describe("ConditionFields — alpr", () => {
  it("renders the list-status select defaulting to all detections", () => {
    const { ui } = Wrapper({ triggerType: "alpr", initial: {} });
    render(ui);
    expect(
      screen.getByText("All detections (incl. unregistered)"),
    ).toBeInTheDocument();
  });

  it("selecting a list status emits { list_status } and back to all emits {}", async () => {
    const user = userEvent.setup();
    const { ui, onChange } = Wrapper({ triggerType: "alpr", initial: {} });
    render(ui);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Blacklisted vehicles"));
    expect(onChange).toHaveBeenLastCalledWith({ list_status: "blacklist" });

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("All detections (incl. unregistered)"));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("reflects an existing blacklist policy's condition", () => {
    const { ui } = Wrapper({
      triggerType: "alpr",
      initial: { list_status: "blacklist" },
    });
    render(ui);
    expect(screen.getByText("Blacklisted vehicles")).toBeInTheDocument();
  });
});
