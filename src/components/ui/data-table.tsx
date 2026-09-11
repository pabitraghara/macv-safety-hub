import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Wraps a <Table> in a Card with flush edges so row hover shading reaches
 * the card boundaries — consistent with the Team page table style.
 *
 * Usage:
 *   <DataTable>
 *     <Table>...</Table>
 *   </DataTable>
 */
export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("hidden md:block", className)}>
      <CardContent className="p-0 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
        {children}
      </CardContent>
    </Card>
  );
}
