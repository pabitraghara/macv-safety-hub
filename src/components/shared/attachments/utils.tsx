import { FileText, Image, Film, Music, Archive } from "lucide-react";

export const getFileIcon = (mediaType: string, contentType: string) => {
  switch (mediaType) {
    case 'IMAGE':
      return <Image className="h-4 w-4" />;
    case 'VIDEO':
      return <Film className="h-4 w-4" />;
    case 'AUDIO':
      return <Music className="h-4 w-4" />;
    default:
      if (contentType.includes('pdf')) {
        return <FileText className="h-4 w-4" />;
      }
      if (contentType.includes('zip') || contentType.includes('rar')) {
        return <Archive className="h-4 w-4" />;
      }
      return <FileText className="h-4 w-4" />;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getMediaTypeBadgeColor = (mediaType: string) => {
  switch (mediaType) {
    case 'IMAGE':
      return 'bg-green-100 text-green-800';
    case 'VIDEO':
      return 'bg-blue-100 text-blue-800';
    case 'AUDIO':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
