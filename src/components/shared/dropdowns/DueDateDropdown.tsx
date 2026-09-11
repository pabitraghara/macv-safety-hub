"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DueDateDropdownProps {
  currentDueDate: Date | undefined;
  onDueDateChange: (date: Date | undefined) => void;
}

export function DueDateDropdown({ currentDueDate, onDueDateChange }: DueDateDropdownProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          <CalendarIcon className="h-4 w-4 text-gray-700 flex-shrink-0" />
          <span className="text-sm text-gray-900 flex-1 text-left">
            {currentDueDate ? format(currentDueDate, "PPP") : "Not specified"}
          </span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={currentDueDate}
          onSelect={(date) => {
            onDueDateChange(date)
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
