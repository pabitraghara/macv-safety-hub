import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/observation-utils";
import { cn } from "@/lib/utils";

interface UserAvatarUser {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  avatar_color?: string;
}

interface UserAvatarProps {
  user: UserAvatarUser | null | undefined;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "h-4 w-4 text-[8px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const initials = getUserInitials(user);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {user?.avatar_url && (
        <AvatarImage src={user.avatar_url} alt={initials} />
      )}
      <AvatarFallback
        style={user?.avatar_color ? { backgroundColor: user.avatar_color, color: "white" } : undefined}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
