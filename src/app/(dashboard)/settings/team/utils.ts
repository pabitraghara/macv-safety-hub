export const AVATAR_COLORS = [
  "#6E56CF", // Purple
  "#5841D8", // Indigo
  "#0091FF", // Blue
  "#00A18E", // Teal
  "#30A46C", // Green
  "#F5D90A", // Yellow
  "#F76808", // Orange
  "#E5484D", // Red
  "#D6409F", // Pink
];

export function getAvatarColor(id: string): string {
  if (!id) return AVATAR_COLORS[0];
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}
