import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { FILE_STORAGE, FileStorage } from '../../infrastructure/storage/file-storage';
import { DomainError } from '../../shared/contracts/errors/domain.error';
import { ALLOWED_TYPES_LABEL, detectFileType } from './domain/file-type';

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const select = {
  id: true,
  filename: true,
  mimeType: true,
  size: true,
  description: true,
  createdAt: true,
} as const;

/** Clinical files (x-rays, documents) per patient. Served only through authorized requests. */
@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  async list(customerId: string, organizationId: string) {
    await this.customer(customerId, organizationId);
    return this.prisma.clinicalAttachment.findMany({
      where: { customerId, organizationId },
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  async upload(
    customerId: string,
    organizationId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; size: number } | undefined,
    description?: string,
  ) {
    await this.customer(customerId, organizationId);
    if (!file || file.size === 0) throw new DomainError('INVALID', 'A file is required');
    if (file.size > MAX_ATTACHMENT_BYTES) throw new DomainError('INVALID', 'File too large (max 15 MB)');
    const mimeType = detectFileType(file.buffer);
    if (!mimeType) throw new DomainError('INVALID', `Unsupported file type. Allowed: ${ALLOWED_TYPES_LABEL}`);

    // Server-generated key: user input (filename) never reaches the file system path
    const storageKey = `${organizationId}/${customerId}/${randomUUID()}`;
    await this.storage.save(storageKey, file.buffer);
    try {
      return await this.prisma.clinicalAttachment.create({
        data: {
          organizationId,
          customerId,
          filename: sanitizeFilename(file.originalname),
          mimeType,
          size: file.size,
          storageKey,
          description: description?.trim() || null,
          uploadedBy: userId,
        },
        select,
      });
    } catch (err) {
      await this.storage.delete(storageKey); // don't leave orphan files
      throw err;
    }
  }

  async download(attachmentId: string, customerId: string, organizationId: string) {
    const att = await this.prisma.clinicalAttachment.findFirst({
      where: { id: attachmentId, customerId, organizationId },
    });
    if (!att) throw new NotFoundException('Attachment not found');
    return { data: await this.storage.read(att.storageKey), mimeType: att.mimeType, filename: att.filename };
  }

  async remove(attachmentId: string, customerId: string, organizationId: string) {
    const att = await this.prisma.clinicalAttachment.findFirst({
      where: { id: attachmentId, customerId, organizationId },
      select: { id: true, storageKey: true },
    });
    if (!att) throw new NotFoundException('Attachment not found');
    await this.prisma.clinicalAttachment.delete({ where: { id: att.id } });
    await this.storage.delete(att.storageKey);
  }

  private async customer(customerId: string, organizationId: string) {
    const exists = await this.prisma.customer.count({ where: { id: customerId, organizationId } });
    if (!exists) throw new NotFoundException('Customer not found');
  }
}

/** Keeps a safe display name for Content-Disposition (no paths, quotes or control chars). */
function sanitizeFilename(raw: string): string {
  // Multer/busboy decode multipart filenames as latin1, but browsers send UTF-8 bytes:
  // re-decode ("radiografÃ­a" → "radiografía"); keep the original if it isn't valid UTF-8.
  const utf8 = Buffer.from(raw, 'latin1').toString('utf8');
  const name = utf8.includes('�') ? raw : utf8;
  const base = name.split(/[\\/]/).pop() ?? 'archivo';
  const clean = base.replace(/[\u0000-\u001f"<>|:*?]/g, '_').trim().slice(0, 200);
  return clean || 'archivo';
}
