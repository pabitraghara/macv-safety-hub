import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

interface SeverityDropdownProps {
  currentSeverity: string;
  onSeverityChange: (severity: string) => void;
}

export function SeverityDropdown({ currentSeverity, onSeverityChange }: SeverityDropdownProps) {
  const severityOptions = [
    { value: "Low", label: "Low", color: "#10b981" },
    { value: "Medium", label: "Medium", color: "#f59e0b" },
    { value: "High", label: "High", color: "#f97316" },
    { value: "Critical", label: "Critical", color: "#ef4444" }
  ];

  const currentOption = severityOptions.find(opt => opt.value === currentSeverity);
  const displaySeverity = currentOption?.label || currentSeverity || "Not specified";
  const currentColor = currentOption?.color || "#64748b";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          <div className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ backgroundColor: currentColor }} aria-hidden="true" />
          <p className="text-sm text-gray-900 flex-1 text-left">{displaySeverity}</p>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-40">
        {severityOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSeverityChange(option.value)}
            className="cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ backgroundColor: option.color }} aria-hidden="true" />
              <span className="text-sm">{option.label}</span>
            </div>
            {currentSeverity === option.value && <Check className="h-4 w-4 text-gray-800" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
