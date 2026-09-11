import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import type { EntityType } from "@/components/shared/types";

interface EntityTypeDropdownProps {
  currentType: EntityType | null | undefined;
  onTypeChange: (type: EntityType | null) => void;
  options: Array<{ value: string; label: string; color: string | null }>;
  placeholder?: string;
}

export function EntityTypeDropdown({
  currentType,
  onTypeChange,
  options,
  placeholder = "Not specified",
}: EntityTypeDropdownProps) {
  const displayType = currentType?.name || placeholder;

  const getCurrentColor = () => {
    if (!currentType?.id) return "#64748b";
    const option = options.find(opt => opt.value === currentType.id);
    return option?.color || "#64748b";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          <div
            className="w-[9px] h-[9px] rounded-full flex-shrink-0"
            style={{ backgroundColor: getCurrentColor() }}
            aria-hidden="true"
          />
          <p className="text-sm text-gray-900 flex-1 text-left">{displayType}</p>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-56">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onTypeChange({
              id: option.value,
              name: option.label,
              code: option.value,
              sla_hours: null,
            })}
            className="cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-[9px] h-[9px] rounded-full flex-shrink-0"
                style={{ backgroundColor: option.color || "#64748b" }}
                aria-hidden="true"
              />
              <span className="text-sm">{option.label}</span>
            </div>
            {currentType?.id === option.value && <Check className="h-4 w-4 text-gray-800" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
