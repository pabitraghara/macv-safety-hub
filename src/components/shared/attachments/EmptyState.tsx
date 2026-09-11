import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  onUpload: () => void;
}

export function EmptyState({ onUpload }: EmptyStateProps) {
  return (
    <Card className="p-4">
      <CardContent className="p-0 text-center">
        <p className="text-sm text-gray-500 mb-4">No attachments found.</p>
        <Button size="sm" variant="outline" onClick={onUpload}>
          <Plus className="h-4 w-4 mr-1" />
          Add Attachment
        </Button>
      </CardContent>
    </Card>
  );
}
