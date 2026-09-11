import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleEditor } from "../ScheduleEditor";
import type { AlertSchedule } from "@/api/alert-policies";

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function ControlledScheduleEditor({
  initial,
  onChange,
}: {
  initial: AlertSchedule | null;
  onChange: (next: AlertSchedule | null) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ScheduleEditor
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("ScheduleEditor", () => {
  it("emits null when master switch is turned OFF", () => {
    const onChange = vi.fn();
    render(
      <ControlledScheduleEditor
        initial={{ timezone: "UTC", windows: [], quiet_hours: [] }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("emits a non-null schedule with browser timezone + empty arrays when turned ON", () => {
    const onChange = vi.fn();
    render(<ControlledScheduleEditor initial={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch"));

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(onChange).toHaveBeenCalledWith({
      timezone: browserTz,
      windows: [],
      quiet_hours: [],
    });
  });

  it("adds a window with days [mon,tue] start 07:00 end 19:00", async () => {
    const onChange = vi.fn();
    render(
      <ControlledScheduleEditor
        initial={{ timezone: "UTC", windows: [], quiet_hours: [] }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add window/i }));

    fireEvent.click(screen.getByRole("button", { name: "Mon" }));
    fireEvent.click(screen.getByRole("button", { name: "Tue" }));

    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "07:00" } });
    fireEvent.change(timeInputs[1], { target: { value: "19:00" } });

    expect(onChange).toHaveBeenLastCalledWith({
      timezone: "UTC",
      windows: [{ days: ["mon", "tue"], start: "07:00", end: "19:00" }],
      quiet_hours: [],
    });
  });

  it("adds quiet hours 22:00 -> 06:00 (overnight accepted, no error)", () => {
    const onChange = vi.fn();
    render(
      <ControlledScheduleEditor
        initial={{ timezone: "UTC", windows: [], quiet_hours: [] }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add quiet hours/i }));

    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "22:00" } });
    fireEvent.change(timeInputs[1], { target: { value: "06:00" } });

    expect(onChange).toHaveBeenLastCalledWith({
      timezone: "UTC",
      windows: [],
      quiet_hours: [{ start: "22:00", end: "06:00" }],
    });
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
  });

  it("updates timezone in the emitted JSON when the select changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ControlledScheduleEditor
        initial={{ timezone: "UTC", windows: [], quiet_hours: [] }}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const listbox = await screen.findByRole("listbox");
    const option = within(listbox).getByText("America/New_York");
    await user.click(option);

    expect(onChange).toHaveBeenLastCalledWith({
      timezone: "America/New_York",
      windows: [],
      quiet_hours: [],
    });
  });
});
