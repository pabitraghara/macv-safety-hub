import { TableCell, TableRow } from "@/components/ui/table";

interface GroupRowProps {
  label: string;
  count: number;
}

export function GroupRow({ label, count }: GroupRowProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={5}
        className="text-muted-foreground bg-muted/40 border-y px-4 py-2 pl-6 text-xs font-medium"
      >
        {label} {count}
      </TableCell>
    </TableRow>
  );
}
