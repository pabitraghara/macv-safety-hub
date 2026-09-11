import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import type { Site } from "@/components/shared/types";

interface SiteDropdownProps {
  currentSite: Site | null | undefined;
  onSiteChange: (site: Site | null) => void;
  options: Array<{ value: string; label: string; color: string | null }>;
}

export function SiteDropdown({ currentSite, onSiteChange, options }: SiteDropdownProps) {
  const displaySite = currentSite?.name || "Not specified";

  const getCurrentSiteColor = () => {
    if (!currentSite?.id) return "#64748b";
    const option = options.find(opt => opt.value === currentSite.id);
    return option?.color || "#64748b";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          <div className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ backgroundColor: getCurrentSiteColor() }} aria-hidden="true" />
          <div className="text-left flex-1">
            <p className="text-sm text-gray-900">{displaySite}</p>
          </div>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-56">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSiteChange({ id: option.value, name: option.label, code: option.value, timezone: 'UTC' })}
            className="cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ backgroundColor: option.color || "#64748b" }} aria-hidden="true" />
              <span className="text-sm">{option.label}</span>
            </div>
            {currentSite?.id === option.value && <Check className="h-4 w-4 text-gray-800" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
