import { useState, useRef } from "react";
import { AttachmentItem } from "./AttachmentItem";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Attachment } from "@/components/shared/types";

interface AttachmentsProps {
  code: string;
  useAttachmentsHook: (code: string) => {
    data: Attachment[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    uploadAttachment: (file: File) => Promise<unknown>;
  };
}

export function Attachments({ code, useAttachmentsHook }: AttachmentsProps) {
  const { data: attachments, loading, error, refetch, uploadAttachment } = useAttachmentsHook(code);
  const [isUploading, setIsUploading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePreview = (attachment: Attachment) => {
    setPreviewAttachment(attachment);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewAttachment(null);
  };

  const handleAddAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await uploadAttachment(file);
      toast.success("Attachment uploaded successfully");
      refetch();
    } catch (uploadError) {
      toast.error("Failed to upload attachment", {
        description: uploadError instanceof Error ? uploadError.message : "An unknown error occurred",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="mb-6">
        <h1 className="text-lg font-medium mb-3">Attachments</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <h1 className="text-lg font-medium mb-3">Attachments</h1>
        <ErrorState error={error} />
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className="mb-6">
        <h1 className="text-lg font-medium mb-3">Attachments</h1>
        <EmptyState onUpload={handleAddAttachmentClick} />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-medium">Attachments ({attachments.length})</h1>
        <Button size="sm" className="h-8" onClick={handleAddAttachmentClick} disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Add Attachment
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      <div className="space-y-3">
        {attachments.map((attachment) => (
          <AttachmentItem
            key={attachment.id}
            attachment={attachment}
            onPreview={handlePreview}
          />
        ))}
      </div>

      <ImagePreviewModal
        attachment={previewAttachment}
        isOpen={showPreviewModal}
        onClose={handleClosePreview}
      />
    </div>
  );
}
