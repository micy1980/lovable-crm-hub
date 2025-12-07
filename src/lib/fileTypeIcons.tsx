import { 
  FileText, 
  FileSpreadsheet, 
  FileType, 
  Image, 
  FileArchive, 
  FileAudio, 
  FileVideo, 
  FileCode, 
  File,
  Presentation
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FileTypeIconInfo {
  icon: LucideIcon;
  className: string;
}

export const getFileTypeIcon = (mimeType: string | null): FileTypeIconInfo => {
  if (!mimeType) {
    return { icon: File, className: 'text-muted-foreground' };
  }

  const mime = mimeType.toLowerCase();

  // PDF
  if (mime === 'application/pdf' || mime === 'application/x-pdf') {
    return { icon: FileType, className: 'text-red-500' };
  }

  // Word documents
  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/rtf'
  ) {
    return { icon: FileText, className: 'text-blue-500' };
  }

  // Excel spreadsheets
  if (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel.sheet.macroenabled.12' ||
    mime === 'text/csv'
  ) {
    return { icon: FileSpreadsheet, className: 'text-green-500' };
  }

  // PowerPoint presentations
  if (
    mime === 'application/vnd.ms-powerpoint' ||
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return { icon: Presentation, className: 'text-orange-500' };
  }

  // Images
  if (mime.startsWith('image/')) {
    return { icon: Image, className: 'text-purple-500' };
  }

  // Audio
  if (mime.startsWith('audio/')) {
    return { icon: FileAudio, className: 'text-pink-500' };
  }

  // Video
  if (mime.startsWith('video/')) {
    return { icon: FileVideo, className: 'text-cyan-500' };
  }

  // Archives
  if (
    mime === 'application/zip' ||
    mime === 'application/x-rar-compressed' ||
    mime === 'application/x-7z-compressed' ||
    mime === 'application/x-tar' ||
    mime === 'application/gzip'
  ) {
    return { icon: FileArchive, className: 'text-yellow-600' };
  }

  // Code / text files
  if (
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'text/html' ||
    mime === 'text/css' ||
    mime === 'application/javascript' ||
    mime === 'text/plain'
  ) {
    return { icon: FileCode, className: 'text-slate-500' };
  }

  // Default
  return { icon: File, className: 'text-muted-foreground' };
};
