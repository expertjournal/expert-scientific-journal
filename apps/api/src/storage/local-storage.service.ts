import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { VirusScanStatus } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly s3Client?: S3Client;
  private readonly bucketName?: string;
  private readonly isS3Configured: boolean;

  constructor() {
    this.uploadDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    this.bucketName = process.env.S3_BUCKET_NAME || 'expert-journal-publications';

    if (endpoint && accessKeyId && secretAccessKey) {
      this.isS3Configured = true;
      this.s3Client = new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log(`Cloudflare R2 / S3 Storage Engine initialized successfully (Bucket: ${this.bucketName})`);
    } else {
      this.isS3Configured = false;
      this.logger.log(`Fallback Local Filesystem Storage active (Path: ${this.uploadDir})`);
    }
  }

  async saveFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType?: string
  ): Promise<{
    objectKey: string;
    checksum: string;
    size: number;
    virusScanStatus: VirusScanStatus;
  }> {
    const ext = path.extname(originalName);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const objectKey = `${Date.now()}-${checksum.substring(0, 12)}${ext}`;

    if (this.isS3Configured && this.s3Client && this.bucketName) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: mimeType || 'application/octet-stream',
          Metadata: {
            originalName,
            checksum,
          },
        })
      );
      this.logger.log(`File uploaded to Cloudflare R2: ${objectKey} (SHA-256: ${checksum})`);
    } else {
      const filePath = path.join(this.uploadDir, objectKey);
      await fs.promises.writeFile(filePath, fileBuffer);
      this.logger.log(`File saved to local storage: ${objectKey} (SHA-256: ${checksum})`);
    }

    return {
      objectKey,
      checksum,
      size: fileBuffer.length,
      virusScanStatus: VirusScanStatus.CLEAN,
    };
  }

  async getDownloadUrl(objectKey: string): Promise<string> {
    if (this.isS3Configured && this.s3Client && this.bucketName) {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });
      // Generate 1-hour presigned URL for secure download
      return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    }
    return `/api/storage/files/${objectKey}`;
  }

  async deleteFile(objectKey: string): Promise<void> {
    if (this.isS3Configured && this.s3Client && this.bucketName) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
        })
      );
      this.logger.log(`File deleted from Cloudflare R2: ${objectKey}`);
    } else {
      const filePath = path.join(this.uploadDir, objectKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`File deleted locally: ${objectKey}`);
      }
    }
  }
}
