import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { randomUUID } from 'crypto';
import { UploadPdfPayload } from './documents.types.js';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Upload and register PDF document metadata
   */
  async uploadPdf(dto: UploadPdfPayload, adminId: string, ipAddress?: string) {
    if (!dto.title || dto.title.trim().length < 2) {
      throw new BadRequestException('Valid document title is required.');
    }

    if (!dto.filename || !dto.filename.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only .pdf files are permitted for document upload.');
    }

    const mime = (dto.mimeType || '').toLowerCase();
    if (mime !== 'application/pdf' && !mime.includes('pdf')) {
      throw new BadRequestException('Invalid MIME type. Document must be application/pdf.');
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB maximum
    if (!dto.fileSize || dto.fileSize <= 0 || dto.fileSize > maxSizeBytes) {
      throw new BadRequestException('File size must be between 1 byte and 10MB.');
    }

    // Generate safe unique storage identifier
    const safeStorageName = `srf_doc_${Date.now()}_${randomUUID().slice(0, 8)}.pdf`;
    const storageUrl = dto.fileUrl || `/storage/documents/${safeStorageName}`;

    const doc = await this.db.pdfDocument.create({
      data: {
        title: dto.title.trim(),
        filename: dto.filename.trim(),
        fileUrl: storageUrl,
        fileSize: dto.fileSize,
        mimeType: 'application/pdf',
        visibility: dto.visibility || 'ADMIN_ONLY',
        eventId: dto.eventId || null,
        uploadedBy: adminId,
      },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'PDF_UPLOADED' as any,
      entity: 'PdfDocument',
      entityId: doc.id,
      before: null,
      after: {
        title: doc.title,
        filename: doc.filename,
        fileSize: doc.fileSize,
      },
      ipAddress,
    });

    this.logger.log(`PDF Document uploaded: ${doc.title} (${doc.id})`);
    return doc;
  }

  async findAll(query?: { eventId?: string; search?: string }) {
    const where: any = {};
    if (query?.eventId) where.eventId = query.eventId;
    if (query?.search && query.search.trim()) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { filename: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    return this.db.pdfDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.db.pdfDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundException('Document not found.');
    }

    return doc;
  }

  async remove(id: string, adminId: string, ipAddress?: string) {
    const doc = await this.db.pdfDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundException('Document not found.');
    }

    await this.db.pdfDocument.delete({
      where: { id },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'PDF_DELETED' as any,
      entity: 'PdfDocument',
      entityId: doc.id,
      before: { title: doc.title, filename: doc.filename },
      after: null,
      ipAddress,
    });

    this.logger.log(`PDF Document deleted: ${doc.title} (${doc.id})`);
    return { success: true, message: 'PDF document deleted successfully.' };
  }
}
