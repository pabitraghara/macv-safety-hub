import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

interface StatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

export function StatusDropdown({ currentStatus, onStatusChange }: StatusDropdownProps) {
  const statusOptions = [
    { value: "Open", label: "Open", icon: "/icons/todo.svg" },
    { value: "InProgress", label: "In Progress", icon: "/icons/inprogress.svg" },
    { value: "Escalated", label: "Escalated", icon: "/icons/inreview.svg" },
    { value: "Resolved", label: "Resolved", icon: "/icons/done.svg" },
    { value: "Closed", label: "Closed", icon: "/icons/x.svg" }
  ];

  const currentOption = statusOptions.find(opt => opt.value === currentStatus);
  const displayStatus = currentOption?.label || currentStatus;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          {currentOption && (
            <img src={currentOption.icon} alt={currentOption.label} width={14} height={14} className="flex-shrink-0" />
          )}
          <span className="text-sm text-gray-900 flex-1 text-left">{displayStatus}</span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-40">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className="cursor-pointer flex items-center gap-3"
          >
            <img src={option.icon} alt={option.label} width={14} height={14} className="flex-shrink-0" />
            <span className="text-sm flex-1">{option.label}</span>
            {currentStatus === option.value && <Check className="h-4 w-4 text-gray-800" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
