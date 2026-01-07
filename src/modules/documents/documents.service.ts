import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CVParsingService } from '../cv-parsing/cv-parsing.service';
import * as fs from 'fs';
import * as path from 'path';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadDir: string;
  private readonly s3Enabled: boolean;

  constructor(
    private prisma: PrismaService,
    private cvParsingService: CVParsingService,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.s3Enabled = !!process.env.AWS_S3_BUCKET;

    // Ensure upload directory exists
    if (!this.s3Enabled && !fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload a document and optionally parse it if it's a CV
   */
  async uploadDocument(
    file: UploadedFile,
    userId: string,
    teamId: string,
    candidateId?: string,
    projectId?: string,
    parseCV: boolean = false,
  ) {
    try {
      // Validate file type
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'application/msword', // DOC
        'image/jpeg',
        'image/png',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Allowed: PDF, DOCX, DOC, JPEG, PNG',
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}-${sanitizedName}`;

      // Store file
      const storagePath = await this.storeFile(file.buffer, fileName, teamId);

      // Create database record
      const document = await this.prisma.document.create({
        data: {
          team_id: teamId,
          user_id: userId,
          file_name: file.originalname,
          mime_type: file.mimetype,
          storage_path: storagePath,
          file_size: file.size,
          candidate_id: candidateId,
          project_id: projectId,
        },
        include: {
          candidate: true,
          project: true,
        },
      });

      // If it's a CV and parsing is requested, extract text and parse
      if (parseCV && candidateId && this.isCV(file.mimetype)) {
        this.parseDocumentCV(document.id, file.buffer, file.mimetype, candidateId, teamId).catch((error) => {
          this.logger.error(`Background CV parsing failed for document ${document.id}: ${error.message}`);
        });
      }

      return document;
    } catch (error) {
      this.logger.error(`Document upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Store file either locally or in S3
   */
  private async storeFile(buffer: Buffer, fileName: string, teamId: string): Promise<string> {
    if (this.s3Enabled) {
      return await this.storeInS3(buffer, fileName, teamId);
    } else {
      return await this.storeLocally(buffer, fileName, teamId);
    }
  }

  /**
   * Store file in S3 bucket
   */
  private async storeInS3(buffer: Buffer, fileName: string, teamId: string): Promise<string> {
    try {
      const bucketName = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_REGION || 'eu-central-1';
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

      if (!bucketName || !accessKeyId || !secretAccessKey) {
        throw new Error('S3 configuration incomplete');
      }

      // Dynamic import of AWS SDK (optional dependency)
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const key = `${teamId}/${fileName}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
        }),
      );

      this.logger.log(`File uploaded to S3: ${key}`);

      return `s3://${bucketName}/${key}`;
    } catch (error) {
      this.logger.error(`S3 upload failed: ${error.message}`);
      // Fallback to local storage
      return await this.storeLocally(buffer, fileName, teamId);
    }
  }

  /**
   * Store file in local filesystem
   */
  private async storeLocally(buffer: Buffer, fileName: string, teamId: string): Promise<string> {
    const teamDir = path.join(this.uploadDir, teamId);

    if (!fs.existsSync(teamDir)) {
      fs.mkdirSync(teamDir, { recursive: true });
    }

    const filePath = path.join(teamDir, fileName);
    fs.writeFileSync(filePath, buffer);

    this.logger.log(`File stored locally: ${filePath}`);

    return filePath;
  }

  /**
   * Check if file type is a CV/Resume
   */
  private isCV(mimeType: string): boolean {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ].includes(mimeType);
  }

  /**
   * Extract text from document and parse as CV
   */
  private async parseDocumentCV(
    documentId: string,
    buffer: Buffer,
    mimeType: string,
    candidateId: string,
    teamId: string,
  ): Promise<void> {
    try {
      let text = '';

      if (mimeType === 'application/pdf') {
        text = await this.extractTextFromPDF(buffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        text = await this.extractTextFromDOCX(buffer);
      }

      if (text.length < 50) {
        this.logger.warn(`Extracted text too short for document ${documentId}, skipping CV parsing`);
        return;
      }

      await this.cvParsingService.parseCVForCandidate(candidateId, text, teamId);

      this.logger.log(`CV parsed successfully for document ${documentId}`);
    } catch (error) {
      this.logger.error(`CV parsing failed for document ${documentId}: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF buffer
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import of pdf-parse (optional dependency)
      const pdfParse = (await import('pdf-parse')).default;

      const data = await pdfParse(buffer);

      return data.text;
    } catch (error) {
      this.logger.error(`PDF text extraction failed: ${error.message}`);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from DOCX buffer
   */
  private async extractTextFromDOCX(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import of mammoth (optional dependency)
      const mammoth = await import('mammoth');

      const result = await mammoth.extractRawText({ buffer });

      return result.value;
    } catch (error) {
      this.logger.error(`DOCX text extraction failed: ${error.message}`);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  /**
   * Get all documents for a team
   */
  async findAll(teamId: string, candidateId?: string, projectId?: string) {
    return this.prisma.document.findMany({
      where: {
        team_id: teamId,
        ...(candidateId && { candidate_id: candidateId }),
        ...(projectId && { project_id: projectId }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        candidate: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Get a single document
   */
  async findOne(id: string, teamId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        user: true,
        candidate: true,
        project: true,
      },
    });

    if (!document || document.team_id !== teamId) {
      throw new BadRequestException('Document not found or access denied');
    }

    return document;
  }

  /**
   * Delete a document
   */
  async remove(id: string, teamId: string) {
    const document = await this.findOne(id, teamId);

    // Delete file from storage
    try {
      if (document.storage_path.startsWith('s3://')) {
        await this.deleteFromS3(document.storage_path);
      } else {
        fs.unlinkSync(document.storage_path);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
    }

    // Delete database record
    return this.prisma.document.delete({
      where: { id },
    });
  }

  /**
   * Delete file from S3
   */
  private async deleteFromS3(s3Uri: string): Promise<void> {
    try {
      const match = s3Uri.match(/^s3:\/\/([^/]+)\/(.+)$/);
      if (!match) {
        throw new Error('Invalid S3 URI');
      }

      const [, bucketName, key] = match;
      const region = process.env.AWS_REGION || 'eu-central-1';
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('S3 credentials not configured');
      }

      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );

      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`S3 deletion failed: ${error.message}`);
      throw error;
    }
  }
}
