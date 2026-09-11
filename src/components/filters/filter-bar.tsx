"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { X, ChevronDown, Calendar, Filter, ListFilter } from "lucide-react";
import {
  Filter as FilterType,
  ActiveFilter,
  FilterParams,
} from "@/api/filters/types";

function usePersistentFilters(key: string) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`filters_${key}`);
      if (stored) {
        setActiveFilters(JSON.parse(stored));
      }
    } catch (error) {
      console.warn("Failed to load stored filters:", error);
    } finally {
      setInitialized(true);
    }
  }, [key]);

  useEffect(() => {
    if (initialized) {
      try {
        sessionStorage.setItem(`filters_${key}`, JSON.stringify(activeFilters));
      } catch (error) {
        console.warn("Failed to save filters:", error);
      }
    }
  }, [activeFilters, key, initialized]);

  const addFilter = useCallback((filter: ActiveFilter) => {
    setActiveFilters((prev) => [...prev, filter]);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== filterId));
  }, []);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<ActiveFilter>) => {
      setActiveFilters((prev) =>
        prev.map((f) => (f.id === filterId ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  return {
    activeFilters,
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    initialized,
  };
}

interface FilterBarProps {
  filters: FilterType[];
  onFiltersChange: (filterParams: FilterParams) => void;
  loading?: boolean;
  filterKey?: string;
  actionButtons?: React.ReactNode;
}

// Generic filter name component
function FilterName({ filter }: { filter: FilterType }) {
  const getFilterIcon = (iconName: string) => {
    switch (iconName) {
      case "alert-triangle":
        return (
          <div className="h-3 w-3 rounded-full border border-orange-500 bg-orange-400" />
        );
      case "circle-dot":
        return (
          <div className="h-3 w-3 rounded-full border border-blue-500 bg-blue-400" />
        );
      case "calendar":
        return <Calendar className="h-3 w-3 text-gray-500" />;
      case "tag":
        return (
          <div className="h-3 w-3 rounded-full border border-purple-500 bg-purple-400" />
        );
      case "map-pin":
        return (
          <div className="h-3 w-3 rounded-full border border-green-500 bg-green-400" />
        );
      case "user":
        return (
          <div className="h-3 w-3 rounded-full border border-gray-500 bg-gray-400" />
        );
      default:
        return <Filter className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {getFilterIcon(filter.icon)}
      <span className="text-xs font-medium text-gray-700">{filter.label}</span>
    </div>
  );
}

// Multiselect filter value component
function MultiSelectValue({
  filter,
  values,
  onUpdate,
}: {
  filter: FilterType;
  values: string[];
  onUpdate: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const getColorIndicator = (color: string | null) => {
    if (!color) return <div className="h-2 w-2 rounded-full bg-gray-400" />;
    return (
      <div
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  };

  const getOptionIndicator = (color: string | null) => {
    if (!color) return <div className="h-3 w-3 rounded-full bg-gray-400" />;
    return (
      <div
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  };

  const toggleValue = (value: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const newValues = values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
    onUpdate(newValues);
  };

  const selectedOptions = filter.options.filter((option) =>
    values.includes(option.value),
  );
  const displayText =
    selectedOptions.length > 0
      ? selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions.length} selected`
      : "Select...";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 border-none px-2 text-xs font-medium text-gray-800 hover:text-gray-900 focus:outline-none focus-visible:ring-0"
        >
          {selectedOptions.length > 0 && selectedOptions.length === 1 ? (
            <>
              {getColorIndicator(selectedOptions[0].color)}
              <span className="max-w-20 truncate text-xs">{displayText}</span>
            </>
          ) : (
            <span className="text-xs text-gray-400">{displayText}</span>
          )}
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-60 w-48 overflow-y-auto"
      >
        {filter.options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(e) => e.preventDefault()}
            onClick={(e) => toggleValue(option.value, e)}
            className="flex cursor-pointer items-center gap-3 py-2"
          >
            <div className="flex items-center gap-2">
              {values.includes(option.value) ? (
                <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-blue-500 bg-blue-500">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              ) : (
                <div className="h-4 w-4 rounded border-2 border-gray-300" />
              )}
              {getOptionIndicator(option.color)}
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span className="text-xs">{option.label}</span>
              <span className="text-xs text-gray-400">{option.count}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Date range filter value component
function DateRangeValue({
  dateRange,
  onUpdate,
}: {
  dateRange?: { from: string; to: string };
  onUpdate: (dateRange: { from: string; to: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(dateRange?.from || "");
  const [tempTo, setTempTo] = useState(dateRange?.to || "");

  const handleApply = () => {
    if (tempFrom || tempTo) {
      onUpdate({ from: tempFrom, to: tempTo });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setTempFrom("");
    setTempTo("");
    onUpdate({ from: "", to: "" });
    setIsOpen(false);
  };

  const displayText = dateRange
    ? `${dateRange.from} - ${dateRange.to}`
    : "Select date range...";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 border-none px-2 text-xs font-medium text-gray-800 hover:text-gray-900 focus:outline-none focus-visible:ring-0"
        >
          <Calendar className="h-3 w-3" />
          <span className="max-w-32 truncate text-xs">
            {dateRange ? displayText : "Select..."}
          </span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-3">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700">From</label>
            <input
              type="date"
              value={tempFrom}
              onChange={(e) => setTempFrom(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">To</label>
            <input
              type="date"
              value={tempTo}
              onChange={(e) => setTempTo(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleApply} className="flex-1">
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Remove filter button
function FilterRemove({ onRemove }: { onRemove: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onRemove}
      className="h-6 w-6 p-0 text-gray-400 hover:bg-red-50 hover:text-red-500 focus:outline-none focus-visible:ring-0"
    >
      <X className="h-3 w-3" />
    </Button>
  );
}

// Main filter bar component
export function FilterBar({
  filters,
  onFiltersChange,
  loading,
  filterKey = "default",
  actionButtons,
}: FilterBarProps) {
  const {
    activeFilters,
    addFilter: addPersistentFilter,
    removeFilter: removePersistentFilter,
    updateFilter: updatePersistentFilter,
    clearFilters: clearPersistentFilters,
    initialized: filtersInitialized,
  } = usePersistentFilters(filterKey);

  const onFiltersChangeRef = useRef(onFiltersChange);

  // Keep ref updated
  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
  }, [onFiltersChange]);

  // Convert active filters to filter params for API calls
  const convertFiltersToParams = useCallback(
    (filters: ActiveFilter[]): FilterParams => {
      const filterParams: FilterParams = {};

      filters.forEach((filter) => {
        if (filter.type === "MULTISELECT" && filter.values.length > 0) {
          // Join multiple values with commas for backend compatibility
          filterParams[filter.field] =
            filter.values.length === 1
              ? filter.values[0]
              : filter.values.join(",");
        } else if (
          filter.type === "DATERANGE" &&
          filter.dateRange &&
          (filter.dateRange.from || filter.dateRange.to)
        ) {
          // Backend expects _start and _end, not _from and _to
          // Only add the filter if at least one date is provided
          if (filter.dateRange.from) {
            filterParams[`${filter.field}_start`] = filter.dateRange.from;
          }
          if (filter.dateRange.to) {
            filterParams[`${filter.field}_end`] = filter.dateRange.to;
          }
        }
      });

      return filterParams;
    },
    [],
  );

  const filterParams = useMemo(
    () => convertFiltersToParams(activeFilters),
    [activeFilters, convertFiltersToParams],
  );

  const prevFilterParamsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!filtersInitialized) return;

    const serialized = JSON.stringify(filterParams);

    // Skip the very first callback when there are no active filters —
    // the parent hook already starts with the correct default params.
    if (
      prevFilterParamsRef.current === null &&
      Object.keys(filterParams).length === 0
    ) {
      prevFilterParamsRef.current = serialized;
      return;
    }

    // Skip if nothing actually changed
    if (prevFilterParamsRef.current === serialized) return;
    prevFilterParamsRef.current = serialized;

    const timeoutId = setTimeout(() => {
      onFiltersChangeRef.current(filterParams);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filterParams, filtersInitialized]);

  const addFilter = (filter: FilterType) => {
    const newFilter: ActiveFilter = {
      id: `${filter.id}-${Date.now()}`,
      type: filter.type,
      field: filter.field,
      label: filter.label,
      values: [],
    };
    addPersistentFilter(newFilter);
  };

  const removeFilter = (filterId: string) => {
    removePersistentFilter(filterId);
  };

  const updateMultiSelectFilter = (filterId: string, values: string[]) => {
    updatePersistentFilter(filterId, { values });
  };

  const updateDateRangeFilter = (
    filterId: string,
    dateRange: { from: string; to: string },
  ) => {
    updatePersistentFilter(filterId, { dateRange });
  };

  const clearAllFilters = () => {
    clearPersistentFilters();
  };

  // Get available filters (not yet added)
  const availableFilters = filters.filter(
    (filter) => !activeFilters.some((af) => af.field === filter.field),
  );

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Active Filters */}
          {activeFilters.map((activeFilter) => {
            const filterDef = filters.find(
              (f) => f.field === activeFilter.field,
            );
            if (!filterDef) return null;

            return (
              <div
                key={activeFilter.id}
                className="flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-2 py-1 shadow-sm"
              >
                <FilterName filter={filterDef} />
                {activeFilter.type === "MULTISELECT" ? (
                  <MultiSelectValue
                    filter={filterDef}
                    values={activeFilter.values}
                    onUpdate={(values) =>
                      updateMultiSelectFilter(activeFilter.id, values)
                    }
                  />
                ) : (
                  <DateRangeValue
                    dateRange={activeFilter.dateRange}
                    onUpdate={(dateRange) =>
                      updateDateRangeFilter(activeFilter.id, dateRange)
                    }
                  />
                )}
                <FilterRemove onRemove={() => removeFilter(activeFilter.id)} />
              </div>
            );
          })}

          {/* Add Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 border-gray-300 focus:outline-none focus-visible:border-gray-300 focus-visible:ring-0"
              >
                <ListFilter className="h-4 w-4" />
                {activeFilters.length > 0 ? "" : "Filter"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {availableFilters.length > 0 ? (
                availableFilters.map((filter) => (
                  <DropdownMenuItem
                    key={filter.id}
                    onClick={() => addFilter(filter)}
                    className="flex cursor-pointer items-center gap-3"
                  >
                    <FilterName filter={filter} />
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>All filters added</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear All Button */}
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-0"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        {actionButtons && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {actionButtons}
          </div>
        )}
      </div>
    </div>
  );
}
