export interface PdfDocumentDto {
  id: string;
  title: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  visibility: 'ADMIN_ONLY' | 'CONTESTANT_VISIBLE' | 'PUBLIC';
  eventId?: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadPdfPayload {
  title: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  visibility?: 'ADMIN_ONLY' | 'CONTESTANT_VISIBLE' | 'PUBLIC';
  fileUrl?: string;
  fileContentBase64?: string;
  eventId?: string;
}
