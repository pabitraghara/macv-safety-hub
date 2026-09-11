import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/UserAvatar";
import { ChevronDown, Check } from "lucide-react";
import { getUserFullName } from "@/lib/observation-utils";
import type { User } from "@/components/shared/types";
import type { FilterOption } from "@/api/filters/types";

interface AssigneeDropdownProps {
  currentAssignee: User | null | undefined;
  onAssigneeChange: (assignee: User | null) => void;
  options: FilterOption[];
}

export function AssigneeDropdown({ currentAssignee, onAssigneeChange, options }: AssigneeDropdownProps) {
  const availableUsers: User[] = options.map(option => ({
    id: option.value,
    email: `${option.label.toLowerCase().replace(' ', '.')}@example.com`,
    first_name: option.label.split(' ')[0] || '',
    last_name: option.label.split(' ').slice(1).join(' ') || '',
    employee_id: option.value,
    avatar_url: option.avatar_url,
    avatar_color: option.avatar_color || undefined
  }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors w-full focus:outline-none focus-visible:ring-0">
          {currentAssignee ? (
            <div className="flex items-center gap-3">
              <UserAvatar user={currentAssignee} size="sm" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{getUserFullName(currentAssignee)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unassigned</p>
          )}
          <ChevronDown className="h-3 w-3 text-gray-400 ml-auto" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => onAssigneeChange(null)}
          className="cursor-pointer flex items-center justify-between"
        >
          <span className="text-sm text-gray-500">Unassigned</span>
          {!currentAssignee && <Check className="h-4 w-4 text-gray-800" />}
        </DropdownMenuItem>
        {availableUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => onAssigneeChange(user)}
            className="cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <UserAvatar user={user} size="sm" />
              <div>
                <p className="text-sm font-medium text-gray-900">{getUserFullName(user)}</p>
              </div>
            </div>
            {currentAssignee?.id === user.id && <Check className="h-4 w-4 text-gray-800" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
