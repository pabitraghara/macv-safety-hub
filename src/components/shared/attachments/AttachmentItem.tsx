import { Download, Eye, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFileIcon, formatFileSize, getMediaTypeBadgeColor } from "./utils";
import type { Attachment } from "@/components/shared/types";

interface AttachmentItemProps {
  attachment: Attachment;
  onPreview: (attachment: Attachment) => void;
}

export function AttachmentItem({ attachment, onPreview }: AttachmentItemProps) {
  const handleDownload = () => {
    window.open(attachment.url, '_blank');
  };

  const handleView = () => {
    if (attachment.media_type === 'IMAGE') {
      onPreview(attachment);
    } else {
      handleDownload();
    }
  };

  const isImage = attachment.media_type === 'IMAGE';

  return (
    <Card className="p-3">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isImage ? (
              <div className="relative">
                <img
                  src={attachment.url}
                  alt={attachment.meta_data.original_filename}
                  className="h-12 w-12 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onPreview(attachment)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                  }}
                />
                <div className="hidden fallback-icon">
                  {getFileIcon(attachment.media_type, attachment.meta_data.content_type)}
                </div>
              </div>
            ) : (
              <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center">
                {getFileIcon(attachment.media_type, attachment.meta_data.content_type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {attachment.meta_data.original_filename}
                </span>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getMediaTypeBadgeColor(attachment.media_type)}`}
                >
                  {attachment.media_type}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(attachment.meta_data.file_size)} • {attachment.meta_data.content_type}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Uploaded {new Date(attachment.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="p-2"
              title={isImage ? "Preview image" : "Open file"}
            >
              {isImage ? <Eye className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="p-2"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
