export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PredefinedRequestBody {
  remark: string;
  description: string;
  filedata: string;
  fileurl: string;
  filename: string;
  filetype: string;
  password: string;
}

export interface Endpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  responseBody: string;
  statusCode: number;
  createdAt: string;
}

export interface TestRequest {
  endpointId: string;
  body: PredefinedRequestBody;
}
