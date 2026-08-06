/**
 * Enterprise S3 File Manager & Version Control Engine
 */

export interface FileRecord {
  id: string;
  articleId?: string;
  objectKey: string;
  bucket: string;
  fileName: string;
  mimeType: string;
  checksumSha256: string;
  sizeBytes: number;
  version: number;
  uploadedBy?: string;
  createdAt: string;
}

const fileRegistry: FileRecord[] = [];

export class FileManagerEngine {
  public static registerFile(
    articleId: string | undefined,
    fileName: string,
    objectKey: string,
    mimeType = "application/pdf",
    sizeBytes = 1048576,
    uploadedBy?: string,
    checksumSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  ): FileRecord {
    const existingVersions = fileRegistry.filter((f) => f.articleId === articleId);
    const newVersionNumber = existingVersions.length + 1;

    const record: FileRecord = {
      id: "file-" + Date.now(),
      articleId,
      objectKey,
      bucket: "expert-journal-publications",
      fileName,
      mimeType,
      checksumSha256,
      sizeBytes,
      version: newVersionNumber,
      uploadedBy,
      createdAt: new Date().toISOString(),
    };

    fileRegistry.unshift(record);
    return record;
  }

  public static getArticleFiles(articleId: string): FileRecord[] {
    return fileRegistry.filter((f) => f.articleId === articleId);
  }

  public static getLatestFile(articleId: string): FileRecord | undefined {
    const files = this.getArticleFiles(articleId);
    return files[0];
  }
}
