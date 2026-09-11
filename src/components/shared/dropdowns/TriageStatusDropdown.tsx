import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, Circle, AlertTriangle, XCircle, ArrowUpRight } from "lucide-react";
import type { ObservationStatus } from "@/api/observations/types";

const TRIAGE_OPTIONS: { value: ObservationStatus; label: string; color: string; icon: typeof Circle }[] = [
  { value: 'open', label: 'Open', color: 'text-blue-600', icon: Circle },
  { value: 'confirmed', label: 'Confirmed', color: 'text-red-600', icon: AlertTriangle },
  { value: 'false_positive', label: 'False Positive', color: 'text-gray-500', icon: XCircle },
  { value: 'escalated', label: 'Escalated', color: 'text-orange-600', icon: ArrowUpRight },
];

interface TriageStatusDropdownProps {
  currentStatus: ObservationStatus;
  onStatusChange: (status: ObservationStatus) => void;
}

export function TriageStatusDropdown({ currentStatus, onStatusChange }: TriageStatusDropdownProps) {
  const currentOption = TRIAGE_OPTIONS.find(opt => opt.value === currentStatus);
  const displayLabel = currentOption?.label || currentStatus;
  const CurrentIcon = currentOption?.icon || Circle;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          <CurrentIcon className={`h-3.5 w-3.5 flex-shrink-0 ${currentOption?.color || 'text-gray-400'}`} />
          <span className="text-sm text-gray-900 flex-1 text-left">{displayLabel}</span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-44">
        {TRIAGE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              className="cursor-pointer flex items-center gap-3"
            >
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${option.color}`} />
              <span className="text-sm flex-1">{option.label}</span>
              {currentStatus === option.value && <Check className="h-4 w-4 text-gray-800" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
