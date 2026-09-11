// Tremor Calendar [v0.1.0] — migrated to react-day-picker v9 API, restyled
// onto the platform's OKLCH theme tokens (was hardcoded gray-xxx Tailwind
// classes in the source). See the vehicles-module port notes for the v8→v9
// API changes this required: IconLeft/IconRight -> Chevron, Caption ->
// custom Nav override, Day -> DayButton, per-month nav -> single global Nav.

"use client";

import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { addYears } from "date-fns";
import {
  DayButton,
  DayPicker,
  useDayPicker,
  type NavProps,
} from "react-day-picker";

import { cn as cx } from "@/lib/utils";

interface NavigationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
}

const NavigationButton = React.forwardRef<
  HTMLButtonElement,
  NavigationButtonProps
>(({ icon, className, ...props }: NavigationButtonProps, forwardedRef) => {
  const Icon = icon;
  return (
    <button
      ref={forwardedRef}
      type="button"
      className={cx(
        "flex size-8 shrink-0 items-center justify-center rounded-md border p-1 transition outline-none select-none",
        "border-input bg-background text-muted-foreground",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0" />
    </button>
  );
});

NavigationButton.displayName = "NavigationButton";

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  enableYearNavigation?: boolean;
};

const Calendar = ({
  weekStartsOn = 1,
  numberOfMonths = 1,
  enableYearNavigation = false,
  disableNavigation,
  locale,
  className,
  classNames,
  components,
  ...props
}: CalendarProps) => {
  function CalendarNav({
    className: navClassName,
    onPreviousClick,
    onNextClick,
    previousMonth,
    nextMonth,
    ...navProps
  }: NavProps) {
    const { goToMonth, months } = useDayPicker();
    const currentMonth = months[0]?.date ?? new Date();

    const goToPreviousYear = (e: React.MouseEvent<HTMLButtonElement>) => {
      const target = addYears(currentMonth, -1);
      if (previousMonth) goToMonth(target);
      onPreviousClick?.(e);
    };

    const goToNextYear = (e: React.MouseEvent<HTMLButtonElement>) => {
      const target = addYears(currentMonth, 1);
      if (nextMonth) goToMonth(target);
      onNextClick?.(e);
    };

    return (
      <nav
        className={cx(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between p-4",
          navClassName,
        )}
        {...navProps}
      >
        <div className="flex items-center gap-1">
          {enableYearNavigation && (
            <NavigationButton
              disabled={disableNavigation || !previousMonth}
              aria-label="Go to previous year"
              onClick={goToPreviousYear}
              icon={ChevronsLeftIcon}
            />
          )}
          <NavigationButton
            disabled={disableNavigation || !previousMonth}
            aria-label="Go to previous month"
            onClick={onPreviousClick}
            icon={ChevronLeftIcon}
          />
        </div>
        <div className="flex items-center gap-1">
          <NavigationButton
            disabled={disableNavigation || !nextMonth}
            aria-label="Go to next month"
            onClick={onNextClick}
            icon={ChevronRightIcon}
          />
          {enableYearNavigation && (
            <NavigationButton
              disabled={disableNavigation || !nextMonth}
              aria-label="Go to next year"
              onClick={goToNextYear}
              icon={ChevronsRightIcon}
            />
          )}
        </div>
      </nav>
    );
  }

  return (
    <DayPicker
      weekStartsOn={weekStartsOn}
      numberOfMonths={numberOfMonths}
      locale={locale}
      showOutsideDays={numberOfMonths === 1}
      disableNavigation={disableNavigation}
      className={cx("relative p-3", className)}
      classNames={{
        months: "flex space-y-0",
        month: "space-y-4 p-3",
        // No `nav` override: CalendarNav sets its own absolute top-aligned
        // layout. A `size-full` here would win via tailwind-merge and stretch
        // the absolute nav to full height, dropping the arrows onto the grid.
        month_caption:
          "flex items-center justify-center h-8 w-full px-8 text-sm font-medium capitalize tabular-nums text-foreground",
        table: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "w-9 font-medium text-sm sm:text-xs text-center text-muted-foreground pb-2",
        week: "w-full mt-0.5 flex",
        day: cx(
          "relative p-0 text-center focus-within:relative",
          "text-foreground",
        ),
        day_button: cx(
          "size-9 rounded-md text-sm focus:z-10",
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        ),
        today: "font-semibold",
        selected: cx(
          "rounded-md",
          "aria-selected:bg-primary aria-selected:text-primary-foreground",
        ),
        disabled:
          "!text-muted-foreground/50 line-through disabled:hover:bg-transparent",
        outside: "text-muted-foreground",
        range_middle: cx(
          "!rounded-none",
          "aria-selected:!bg-accent aria-selected:!text-accent-foreground",
        ),
        range_start: "rounded-r-none !rounded-l-md",
        range_end: "rounded-l-none !rounded-r-md",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Nav: CalendarNav,
        DayButton: (dayButtonProps) => {
          const {
            day,
            modifiers,
            className: dbClassName,
            children,
            ...rest
          } = dayButtonProps;
          const { today, selected, range_middle } = modifiers;
          // A selected endpoint (single day, or range start/end) sits on a
          // solid primary background. The day_button base sets text-foreground
          // directly on the button, which overrides the parent cell's
          // text-primary-foreground and renders dark text on the dark
          // selection — so re-assert the foreground here (after dbClassName so
          // tailwind-merge lets it win).
          const isSelectedEndpoint = selected && !range_middle;
          return (
            <DayButton
              day={day}
              modifiers={modifiers}
              className={cx(
                "relative",
                dbClassName,
                isSelectedEndpoint &&
                  "text-primary-foreground hover:text-primary-foreground hover:bg-transparent",
              )}
              {...rest}
            >
              {children}
              {today && (
                <span
                  className={cx(
                    "absolute inset-x-1/2 bottom-1.5 h-0.5 w-4 -translate-x-1/2 rounded-[2px]",
                    modifiers.selected ? "bg-primary-foreground" : "bg-primary",
                  )}
                />
              )}
            </DayButton>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
};

Calendar.displayName = "Calendar";

export { Calendar };
export type { Matcher } from "react-day-picker";
