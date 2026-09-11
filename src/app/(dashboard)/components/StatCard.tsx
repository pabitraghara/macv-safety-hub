import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
  loading,
  href,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  iconClassName?: string;
  loading?: boolean;
  href?: string;
}) {
  const card = (
    <Card
      className={`relative overflow-hidden${href ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-sm font-medium">
            {title}
          </CardDescription>
          <div
            className={`rounded-lg p-2 ${iconClassName ?? "bg-primary/10 text-primary"}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold tracking-tight">{value}</div>
        )}
        {subtitle && (
          <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }

  return card;
}
