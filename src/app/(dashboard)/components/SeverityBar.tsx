import { formatLabel } from "./helpers";

export function SeverityBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-16 text-xs font-medium">
        {formatLabel(label)}
      </span>
      <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums">
        {count}
      </span>
    </div>
  );
}
