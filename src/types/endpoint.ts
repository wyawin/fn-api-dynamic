export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PredefinedRequestBody {
  remark?: string;
  description: string;
  filedata: string;
  fileurl: string;
  filename: string;
  filetype: string;
  password?: string;
}

export interface ResponseMetadata {
  fields: Record<string, {
    type?: string;
    description?: string;
    decimalPlaces?: number;
    choices?: string[];
  }>;
}

export interface Endpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  responseBody: string;
  metadata?: ResponseMetadata;
  statusCode: number;
  createdAt: string;
}

export interface TestRequest {
  endpointId: string;
  body: PredefinedRequestBody;
}
