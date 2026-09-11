import { format } from "date-fns";
import type { User as UserType, Activity } from "@/components/shared/types";
import type { Filter, FilterOption } from '@/api/filters/types';
import {
  MessageCircle,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Info,
  Edit,
  FileText,
  Activity as ActivityIcon,
  Paperclip,
  AlertTriangle,
} from "lucide-react";

export function getSeverityColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "open":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in progress":
    case "inprogress":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "escalated":
      return "bg-red-100 text-red-800 border-red-200";
    case "resolved":
      return "bg-green-100 text-green-800 border-green-200";
    case "closed":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function formatDate(dateString: string | null) {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return "Invalid date";
    }
  }
  
  export function formatDateLong(dateString: string | null) {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "EEEE, MMMM dd, yyyy 'at' HH:mm");
    } catch {
      return "Invalid date";
    }
  }
  
  export function formatRelativeTime(dateString: string | null) {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      // Just now (within 1 minute)
      if (diffInMinutes < 1) return "just now";
      
      // X mins ago (within the last hour)
      if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? "s" : ""} ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24)
        return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7)
        return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
      
      if (diffInDays < 30) {
        const diffInWeeks = Math.floor(diffInDays / 7);
        return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
      }

      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
      }

      return formatDate(dateString);
    } catch {
      return "Invalid date";
    }
  }
  
  export function getUserInitials(user: { first_name?: string; last_name?: string } | null | undefined): string {
    if (!user) return "U";
    
    const firstName = user.first_name;
    const lastName = user.last_name;
    
    return (
      `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() ||
        "U"
    );
  }
  
  export function getUserFullName(user: { first_name?: string; last_name?: string; email?: string } | null | undefined): string {
    if (!user) return "Unknown User";
    return (
      `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      user.email ||
      "Unknown User"
    );
  }

/**
 * Extract options from filters array for a specific field
 * @param filters - Array of filter objects
 * @param fieldName - Name of the field to extract options for
 * @returns Array of options for the specified field
 */
export const getFilterOptions = (filters: Filter[], fieldName: string): FilterOption[] => {
  const filter = filters.find((f: Filter) => f.field === fieldName);
  return filter?.options || [];
};

// Activity-specific utility functions
export function getActivityIcon(activityType: string) {
  switch (activityType.toUpperCase()) {
    case "COMMENT_ADDED":
      return MessageCircle;
    case "STATUS_CHANGED":
      return CheckCircle;
    case "ASSIGNED":
      return User;
    case "UNASSIGNED":
      return User;
    case "CREATED":
      return FileText;
    case "UPDATED":
      return Edit;
    case "ESCALATED":
      return AlertCircle;
    case "RESOLVED":
      return CheckCircle;
    case "CLOSED":
      return CheckCircle;
    case "REOPENED":
      return CheckCircle;
    case "ATTACHMENT_ADDED":
      return Paperclip;
    case "ATTACHMENT_REMOVED":
      return Paperclip;
    case "SUGGESTION_ADDED":
      return Info;
    case "SUGGESTION_APPROVED":
      return CheckCircle;
    case "PRIORITY_CHANGED":
      return AlertTriangle;
    case "SEVERITY_CHANGED":
      return AlertTriangle;
    case "DUE_DATE_CHANGED":
      return Calendar;
    default:
      return ActivityIcon;
  }
}

export function getActivityColor(activityType: string) {
  switch (activityType.toUpperCase()) {
    case "COMMENT_ADDED":
      return "bg-blue-500";
    case "STATUS_CHANGED":
      return "bg-purple-500";
    case "ASSIGNED":
      return "bg-green-500";
    case "UNASSIGNED":
      return "bg-red-500";
    case "CREATED":
      return "bg-gray-500";
    case "UPDATED":
      return "bg-yellow-500";
    case "ESCALATED":
      return "bg-orange-500";
    case "RESOLVED":
      return "bg-green-600";
    case "CLOSED":
      return "bg-gray-600";
    case "REOPENED":
      return "bg-blue-600";
    case "ATTACHMENT_ADDED":
      return "bg-indigo-500";
    case "ATTACHMENT_REMOVED":
      return "bg-red-400";
    case "SUGGESTION_ADDED":
      return "bg-cyan-500";
    case "SUGGESTION_APPROVED":
      return "bg-emerald-500";
    case "PRIORITY_CHANGED":
      return "bg-amber-500";
    case "SEVERITY_CHANGED":
      return "bg-red-600";
    case "DUE_DATE_CHANGED":
      return "bg-violet-500";
    case "UPDATED":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

export function formatActivityDescription(activity: Activity) {
  const actorName = getUserFullName(activity.actor);
  return `${actorName} ${activity.description}`;
}