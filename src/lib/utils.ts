import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string into a human-readable relative time format
 * @param dateString - ISO date string
 * @returns Formatted relative time string (e.g., "just now", "5 mins ago", "2 days ago")
 */
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  } catch {
    return 'Invalid date';
  }
}

/**
 * Priority options with labels and icons
 */
export const PRIORITY_OPTIONS = [
  { value: "0", label: "No priority", icon: "/icons/none.svg" },
  { value: "1", label: "Urgent", icon: "/icons/urgent.svg" },
  { value: "2", label: "High", icon: "/icons/high.svg" },
  { value: "3", label: "Medium", icon: "/icons/medium.svg" },
  { value: "4", label: "Low", icon: "/icons/low.svg" }
] as const;

/**
 * Get priority label from priority value
 * @param priority - Priority value (string or number)
 * @returns Priority label
 */
export function getPriorityLabel(priority: string | number): string {
  const priorityOption = PRIORITY_OPTIONS.find(opt => opt.value === String(priority));
  return priorityOption?.label || `Priority ${priority}`;
}
