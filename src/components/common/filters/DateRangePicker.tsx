"use client";

import React from "react";
import {
  DateRange,
  DateRangePicker,
} from "@/components/tremor/inputs/DatePicker";

interface DateRangePickerWithPresetsProps {
  value?: DateRange;
  onChange?: (dateRange: DateRange | undefined) => void;
  showTimePicker?: boolean;
}

export const DateRangePickerWithPresets = ({
  value,
  onChange,
  showTimePicker = false,
}: DateRangePickerWithPresetsProps) => {
  const defaultDateRange: DateRange = {
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  };

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    value ?? defaultDateRange,
  );

  React.useEffect(() => {
    setDateRange(value ?? defaultDateRange);
  }, [value]);

  const handleDateChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
    onChange?.(newDateRange);
  };

  const presets = [
    {
      label: "Today",
      dateRange: {
        from: (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })(),
      },
    },
    {
      label: "Last 7 days",
      dateRange: {
        from: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })(),
      },
    },
    {
      label: "Last 30 days",
      dateRange: {
        from: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })(),
      },
    },
    {
      label: "Last 3 months",
      dateRange: {
        from: (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - 3);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })(),
      },
    },
    {
      label: "Last 6 months",
      dateRange: {
        from: (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - 6);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })(),
      },
    },
    {
      label: "Month to date",
      dateRange: {
        from: (() => {
          const d = new Date();
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })(),
      },
    },
    {
      label: "Year to date",
      dateRange: {
        from: (() => {
          const d = new Date();
          d.setMonth(0, 1);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        to: (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })(),
      },
    },
  ];
  return (
    <DateRangePicker
      presets={presets}
      value={dateRange}
      onChange={handleDateChange}
      showTimePicker={showTimePicker}
      className="w-100"
    />
  );
};
