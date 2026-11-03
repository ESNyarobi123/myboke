import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PresignUploadDto } from './dto/upload.dto';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

@Injectable()
export class UploadsService {
  private readonly localDir =
    process.env.UPLOAD_DIR ?? join(process.cwd(), 'storage', 'uploads');

  private s3(): S3Client | null {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION ?? 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT;

    if (!bucket) return null;

    return new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials:
        process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY,
              secretAccessKey: process.env.S3_SECRET_KEY,
            }
          : undefined,
    });
  }

  private extension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase().slice(0, 6) : 'bin';
  }

  async presign(businessId: string, userId: string, dto: PresignUploadDto) {
    if (!ALLOWED_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `Aina ya faili haikubaliki. Ruhusa: ${ALLOWED_TYPES.join(', ')}`,
      );
    }
    if (dto.size && dto.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Ukubwa wa juu ni 10 MB.');
    }

    const key = `${dto.kind}/${businessId}/${Date.now().toString(36)}-${randomBytes(
      4,
    ).toString('hex')}.${this.extension(dto.filename)}`;

    const client = this.s3();

    if (!client) {
      // Dev fallback: upload ya moja kwa moja kwenye API
      return {
        mode: 'direct' as const,
        method: 'POST',
        uploadUrl: `/v1/uploads/local`,
        key,
        fields: { key, contentType: dto.contentType },
        publicUrl: `${process.env.PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/uploads/local/${key}`,
        expiresIn: 900,
        maxSizeBytes: 10 * 1024 * 1024,
        note: 'S3 haijawekwa — tumia multipart POST na field `file`.',
        userId,
      };
    }

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    const publicBase =
      process.env.S3_PUBLIC_URL ??
      `${process.env.S3_ENDPOINT ?? `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION ?? 'us-east-1'}.amazonaws.com`}`;

    return {
      mode: 's3' as const,
      method: 'PUT',
      uploadUrl,
      key,
      headers: { 'Content-Type': dto.contentType },
      publicUrl: `${publicBase.replace(/\/$/, '')}/${key}`,
      expiresIn: 900,
      maxSizeBytes: 10 * 1024 * 1024,
    };
  }

  /** Dev-only: hifadhi faili kwenye diski ya ndani. */
  async saveLocal(key: string, buffer: Buffer) {
    const safe = key.replace(/\.\./g, '').replace(/^\/+/, '');
    const target = join(this.localDir, safe);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, buffer);
    return {
      key: safe,
      url: `${process.env.PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/uploads/local/${safe}`,
      size: buffer.length,
    };
  }
}
