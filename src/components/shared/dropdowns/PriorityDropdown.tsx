import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { PRIORITY_OPTIONS } from "@/lib/utils";

interface PriorityDropdownProps {
  currentPriority: string;
  onPriorityChange: (priority: string) => void;
}

export function PriorityDropdown({ currentPriority, onPriorityChange }: PriorityDropdownProps) {
  const currentOption = PRIORITY_OPTIONS.find(opt => opt.value === currentPriority);
  const displayPriority = currentOption?.label || "No priority";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          {currentOption && (
            <img src={currentOption.icon} alt={currentOption.label} width={16} height={16} className="flex-shrink-0" />
          )}
          <p className="text-sm text-gray-900 flex-1 text-left">{displayPriority}</p>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-52">
        {PRIORITY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onPriorityChange(option.value)}
            className="cursor-pointer flex items-center gap-3"
          >
            <img src={option.icon} alt={option.label} width={16} height={16} className="flex-shrink-0" />
            <span className="text-sm flex-1">{option.label}</span>
            {currentPriority === option.value && <Check className="h-4 w-4 text-gray-800 mr-1" />}
            <span className="text-xs text-gray-400">{option.value}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
