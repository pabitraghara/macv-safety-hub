import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  title?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  message,
  title,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
      <div className="px-6 text-center">
        <div className="bg-muted mb-3 inline-flex rounded-lg p-3">
          <Inbox className="text-muted-foreground h-6 w-6" />
        </div>
        {title && <p className="text-sm font-semibold">{title}</p>}
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          {message}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
