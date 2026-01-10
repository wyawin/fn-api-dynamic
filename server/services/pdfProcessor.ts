import { fromBase64 } from 'pdf2pic';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface PDFPage {
  pageNumber: number;
  imageBase64: string;
}

interface ConversionOptions {
  density: number;
  format: string;
  width: number;
  height: number;
}

export class PDFProcessor {
  private readonly tempDir: string;
  private readonly defaultOptions: ConversionOptions = {
    density: 200,
    format: 'jpg',
    width: 2000,
    height: 2000,
  };

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'pdf-processing');
  }

  async convertPDFToImages(base64PDF: string): Promise<PDFPage[]> {
    await this.ensureTempDirectory();

    const tempPdfPath = await this.writeTempPDFFile(base64PDF);

    try {
      const pages = await this.extractAllPages(base64PDF);
      return pages;
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.cleanup(tempPdfPath);
    }
  }

  isPDF(filetype: string): boolean {
    const normalizedType = filetype.toLowerCase();
    return normalizedType === 'pdf' || normalizedType === 'application/pdf';
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  private async writeTempPDFFile(base64PDF: string): Promise<string> {
    const pdfBuffer = Buffer.from(base64PDF, 'base64');
    const tempPdfPath = path.join(this.tempDir, `temp-${Date.now()}.pdf`);
    await fs.writeFile(tempPdfPath, pdfBuffer);
    return tempPdfPath;
  }

  private async extractAllPages(base64PDF: string): Promise<PDFPage[]> {
    const converter = this.createConverter(base64PDF);
    const pages: PDFPage[] = [];
    let currentPageNumber = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const page = await this.extractSinglePage(converter, currentPageNumber);

      if (page) {
        pages.push(page);
        currentPageNumber++;
      } else {
        hasMorePages = false;
      }
    }

    return pages;
  }

  private createConverter(base64PDF: string) {
    const options = {
      ...this.defaultOptions,
      saveFilename: `page-${Date.now()}`,
      savePath: this.tempDir,
    };

    return fromBase64(base64PDF, options);
  }

  private async extractSinglePage(
    converter: any,
    pageNumber: number
  ): Promise<PDFPage | null> {
    try {
      const pageResult = await converter(pageNumber, { responseType: 'base64' });

      if (pageResult && pageResult.base64) {
        return {
          pageNumber,
          imageBase64: pageResult.base64,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async cleanup(tempPdfPath: string): Promise<void> {
    try {
      await fs.unlink(tempPdfPath);
    } catch (error) {
      console.error('Error deleting temp PDF file:', error);
    }

    await this.cleanupTempDirectory();
  }

  private async cleanupTempDirectory(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.tempDir, file)).catch(() => {}))
      );
    } catch (error) {
      console.error('Error cleaning temp directory:', error);
    }
  }
}

export const createPDFProcessor = (): PDFProcessor => {
  return new PDFProcessor();
};
