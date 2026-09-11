import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import type { Department } from "@/components/shared/types";

interface DepartmentDropdownProps {
  currentDepartment: Department | null | undefined;
  onDepartmentChange: (department: Department | null) => void;
  options: Array<{ value: string; label: string; color: string | null }>;
}

export function DepartmentDropdown({ currentDepartment, onDepartmentChange, options }: DepartmentDropdownProps) {
  const displayDepartment = currentDepartment?.name || "Not specified";

  const getCurrentDepartmentColor = () => {
    if (!currentDepartment?.id) return "#64748b";
    const option = options.find(opt => opt.value === currentDepartment.id);
    return option?.color || "#64748b";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          <div className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ backgroundColor: getCurrentDepartmentColor() }} aria-hidden="true" />
          <p className="text-sm text-gray-900 flex-1 text-left">{displayDepartment}</p>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-56">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onDepartmentChange({ id: option.value, name: option.label, code: option.value })}
            className="cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ backgroundColor: option.color || "#64748b" }} aria-hidden="true" />
              <span className="text-sm">{option.label}</span>
            </div>
            {currentDepartment?.id === option.value && <Check className="h-4 w-4 text-gray-800" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
