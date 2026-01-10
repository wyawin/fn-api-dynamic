import axios, { AxiosInstance } from 'axios';
import { createPDFProcessor, PDFPage } from './pdfProcessor.js';

interface LLMConfig {
  model: string;
  baseUrl: string;
}

interface DocumentData {
  filedata: string;
  fileurl: string;
  filename: string;
  filetype: string;
  description: string;
  remark?: string;
  password?: string;
}

interface ExtractionRequest {
  document: DocumentData;
  expectedSchema: any;
  metadata?: Record<string, any>;
  documentType?: string;
}

export class LLMService {
  private config: LLMConfig;
  private axiosInstance: AxiosInstance;
  private pdfProcessor: ReturnType<typeof createPDFProcessor>;

  constructor(config: LLMConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000,
    });
    this.pdfProcessor = createPDFProcessor();
  }

  async extractDocumentData(request: ExtractionRequest): Promise<any> {
    const { document, expectedSchema, metadata, documentType } = request;

    if (this.pdfProcessor.isPDF(document.filetype)) {
      return await this.extractFromPDF(document, expectedSchema, metadata, documentType);
    } else {
      return await this.extractFromImage(document, expectedSchema, metadata, documentType);
    }
  }

  private async extractFromImage(
    document: DocumentData,
    expectedSchema: any,
    metadata?: Record<string, any>,
    documentType?: string
  ): Promise<any> {
    const prompt = this.buildExtractionPrompt(document, expectedSchema, metadata, documentType);

    try {
      const response = await this.callLLM(prompt, document.filedata ? [document.filedata] : undefined);

      try {
        return JSON.parse(response);
      } catch {
        return { error: 'Failed to parse LLM response as JSON', raw: response };
      }
    } catch (error) {
      console.error('Image extraction error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Image extraction failed: ${error.message}`);
      }
      throw new Error(`Image extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractFromPDF(
    document: DocumentData,
    expectedSchema: any,
    metadata?: Record<string, any>,
    documentType?: string
  ): Promise<any> {
    try {
      console.log(`Processing PDF: ${document.filename}`);

      const pages = await this.pdfProcessor.convertPDFToImages(document.filedata);
      console.log(`PDF converted to ${pages.length} page(s)`);

      const pageResults = await this.processAllPages(pages, document, expectedSchema, metadata, documentType);

      return this.combinePageResults(pageResults, expectedSchema);
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processAllPages(
    pages: PDFPage[],
    document: DocumentData,
    expectedSchema: any,
    metadata?: Record<string, any>,
    documentType?: string
  ): Promise<any[]> {
    const pageResults: any[] = [];
    const previousPagesContext: string[] = [];

    for (const page of pages) {
      const pageResult = await this.processSinglePage(
        page,
        pages.length,
        document,
        expectedSchema,
        metadata,
        previousPagesContext,
        documentType
      );

      pageResults.push(pageResult);

      if (pageResult.data) {
        previousPagesContext.push(
          `Page ${page.pageNumber}: ${JSON.stringify(pageResult.data, null, 2)}`
        );
      }
    }

    return pageResults;
  }

  private async processSinglePage(
    page: PDFPage,
    totalPages: number,
    document: DocumentData,
    expectedSchema: any,
    metadata: Record<string, any> | undefined,
    previousPagesContext: string[],
    documentType?: string
  ): Promise<any> {
    console.log(`Processing page ${page.pageNumber}/${totalPages}`);

    const contextInfo = previousPagesContext.length > 0
      ? `\n\nContext from previous pages:\n${previousPagesContext.join('\n\n')}`
      : '';

    const enhancedDocument = {
      ...document,
      description: `${document.description}\n\nThis is page ${page.pageNumber} of ${totalPages} in the PDF document.${contextInfo}`,
    };

    const prompt = this.buildExtractionPrompt(enhancedDocument, expectedSchema, metadata, documentType);

    try {
      const llmResponse = await this.callLLM(prompt, [page.imageBase64]);
      const pageData = JSON.parse(llmResponse);

      return {
        page: page.pageNumber,
        data: pageData,
      };
    } catch (parseError) {
      console.error(`Failed to parse response for page ${page.pageNumber}:`, parseError);
      return {
        page: page.pageNumber,
        error: 'Failed to parse response',
        raw: parseError,
      };
    }
  }

  private async callLLM(prompt: string, images?: string[]): Promise<string> {
    const response = await this.axiosInstance.post('/api/generate', {
      model: this.config.model,
      prompt,
      stream: false,
      format: 'json',
      images,
    });

    const result = response.data;

    // Some models (like qwen2.5-vl:7b) may return data in 'thinking' field
    const llmResponse = result.thinking || result.response;

    if (!llmResponse) {
      console.error('LLM response structure:', JSON.stringify(result, null, 2));
      throw new Error('No response or thinking field found in LLM output');
    }

    return llmResponse;
  }

  private combinePageResults(pageResults: any[], expectedSchema: any): any {
    if (pageResults.length === 0) {
      return expectedSchema;
    }

    if (pageResults.length === 1) {
      return pageResults[0].data || pageResults[0];
    }

    const combinedResult: any = {};
    const schemaKeys = Object.keys(expectedSchema);

    for (const key of schemaKeys) {
      const values: any[] = [];

      for (const pageResult of pageResults) {
        const pageData = pageResult.data || pageResult;
        if (pageData[key] !== undefined && pageData[key] !== null && pageData[key] !== '') {
          values.push(pageData[key]);
        }
      }

      if (values.length === 0) {
        combinedResult[key] = expectedSchema[key];
      } else if (Array.isArray(expectedSchema[key])) {
        combinedResult[key] = values.flat();
      } else if (typeof expectedSchema[key] === 'object' && expectedSchema[key] !== null) {
        combinedResult[key] = Object.assign({}, ...values);
      } else if (typeof expectedSchema[key] === 'string') {
        combinedResult[key] = values.join(' ');
      } else if (typeof expectedSchema[key] === 'number') {
        combinedResult[key] = values[values.length - 1];
      } else {
        combinedResult[key] = values[values.length - 1];
      }
    }

    combinedResult._pageResults = pageResults;
    combinedResult._totalPages = pageResults.length;

    return combinedResult;
  }

  private buildExtractionPrompt(
    document: DocumentData,
    expectedSchema: any,
    metadata?: Record<string, any>,
    documentType?: string
  ): string {
    let prompt = `You are a document extraction assistant. Extract information from the provided document according to the specified schema.`;

    if (documentType) {
      prompt += `\n\nDocument Type: ${documentType}`;
    }

    // Build enhanced schema with descriptions as values
    const enhancedSchema: any = {};
    if (metadata && Object.keys(metadata).length > 0) {
      for (const [fieldName, value] of Object.entries(expectedSchema)) {
        const fieldMeta = metadata[fieldName] as any;

        // Check if this is an array_of_objects field
        if (fieldMeta?.type === 'array_of_objects' && Array.isArray(value) && value.length > 0) {
          // Build the object schema from child metadata
          const objectSchema: any = {};
          const childPrefix = `${fieldName}[].`;

          // Find all child field metadata
          for (const [metaKey, metaValue] of Object.entries(metadata)) {
            if (metaKey.startsWith(childPrefix)) {
              const childName = metaKey.substring(childPrefix.length);
              const childMeta = metaValue as any;
              let childDescription = childMeta?.description || childName;

              // Add format specifications for child fields
              if (childMeta?.type) {
                const type = childMeta.type.toLowerCase();

                if (type === 'multiple_choice' && childMeta.choices && Array.isArray(childMeta.choices)) {
                  childDescription = `${childDescription} (return in one of the options: ${childMeta.choices.join(', ')})`;
                } else if (type === 'date') {
                  childDescription = `${childDescription} (return in format YYYY-MM-DD)`;
                } else if (type === 'datetime') {
                  childDescription = `${childDescription} (return in format YYYY-MM-DD HH:MM:SS)`;
                } else if (type === 'time') {
                  childDescription = `${childDescription} (return in format HH:MM:SS)`;
                } else if (type === 'boolean') {
                  childDescription = `${childDescription} (Return in Boolean)`;
                }
              }

              objectSchema[childName] = childDescription;
            }
          }

          // Use the built schema or fall back to the original value
          enhancedSchema[fieldName] = Object.keys(objectSchema).length > 0 ? [objectSchema] : value;
        } else {
          // Handle non-array_of_objects fields
          let description = fieldMeta?.description || value;

          // Add format specifications based on field type
          if (fieldMeta?.type) {
            const type = fieldMeta.type.toLowerCase();

            if (type === 'multiple_choice' && fieldMeta.choices && Array.isArray(fieldMeta.choices)) {
              description = `${description} (return in one of the options: ${fieldMeta.choices.join(', ')})`;
            } else if (type === 'date') {
              description = `${description} (return in format YYYY-MM-DD)`;
            } else if (type === 'datetime') {
              description = `${description} (return in format YYYY-MM-DD HH:MM:SS)`;
            } else if (type === 'time') {
              description = `${description} (return in format HH:MM:SS)`;
            } else if (type === 'boolean') {
              description = `${description} (Return in Boolean)`;
            } else if (type === 'array') {
              description = `${description} (Return in array of value)`;
            }
          }

          enhancedSchema[fieldName] = description;
        }
      }
    } else {
      Object.assign(enhancedSchema, expectedSchema);
    }

    prompt += `\n\nExpected Output Schema (field values show what to extract):
${JSON.stringify(enhancedSchema, null, 2)}`;

    prompt += `\n\nInstructions:
1. Carefully analyze the document image/content
2. Extract the requested information according to the schema
3. Ensure all extracted values match their specified types
4. For fields with choices, only use values from the provided list
5. For numeric fields with decimal places, format accordingly
6. Return ONLY valid JSON matching the schema structure
7. If a field cannot be found, use null or an appropriate default value

Return the extracted data as JSON:`;

    return prompt;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/api/tags');
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.axiosInstance.get('/api/tags');
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }
}

export const createLLMService = (model: string = 'qwen3-vl:2b', baseUrl: string = 'http://localhost:11434'): LLMService => {
  return new LLMService({ model, baseUrl });
};
