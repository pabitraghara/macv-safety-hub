import { ExternalLink, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "./utils";
import type { Attachment } from "@/components/shared/types";

interface ImagePreviewModalProps {
  attachment: Attachment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImagePreviewModal({ attachment, isOpen, onClose }: ImagePreviewModalProps) {
  if (!attachment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg font-semibold">
            {attachment.meta_data.original_filename}
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 overflow-hidden">
          <img
            src={attachment.url}
            alt={attachment.meta_data.original_filename}
            className="w-full h-auto max-h-[70vh] object-contain"
          />
        </div>
        <div className="p-4 pt-2 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {formatFileSize(attachment.meta_data.file_size)} • {attachment.meta_data.content_type}
            </span>
            <span>Uploaded {new Date(attachment.uploaded_at).toLocaleDateString()}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => window.open(attachment.url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in new tab
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(attachment.url, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
