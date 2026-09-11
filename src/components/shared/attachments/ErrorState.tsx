import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <p className="text-sm text-red-600">Error loading attachments: {error}</p>
      </CardContent>
    </Card>
  );
}
