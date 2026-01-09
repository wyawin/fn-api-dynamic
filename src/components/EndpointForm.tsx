import { useState, useEffect } from 'react';
import { Endpoint, HttpMethod, ResponseMetadata } from '../types/endpoint';
import { Save, FileJson } from 'lucide-react';
import { ResponseBuilder } from './ResponseBuilder';

interface EndpointFormProps {
  endpoint?: Endpoint;
  onSave: (endpoint: Omit<Endpoint, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function EndpointForm({ endpoint, onSave, onCancel }: EndpointFormProps) {
  const [name, setName] = useState('');
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');
  const [statusCode, setStatusCode] = useState(200);
  const [responseBody, setResponseBody] = useState('');
  const [metadata, setMetadata] = useState<ResponseMetadata | undefined>();

  useEffect(() => {
    if (endpoint) {
      setName(endpoint.name);
      setMethod(endpoint.method);
      setPath(endpoint.path);
      setDescription(endpoint.description);
      setStatusCode(endpoint.statusCode);
      setResponseBody(endpoint.responseBody);
      setMetadata(endpoint.metadata);
    }
  }, [endpoint]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      method,
      path,
      description,
      statusCode,
      responseBody,
      metadata,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {endpoint ? 'Edit Endpoint' : 'Create New Endpoint'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ outlineColor: '#1f51fe' }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(31, 81, 254, 0.2)'}
                onBlur={(e) => e.target.style.boxShadow = ''}
                placeholder="User Login"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTTP Method *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Path *
              </label>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="/api/users/login"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Code *
              </label>
              <input
                type="number"
                value={statusCode}
                onChange={(e) => setStatusCode(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="100"
                max="599"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Brief description of what this endpoint does"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileJson style={{ color: '#1f51fe' }} size={20} />
              <label className="block text-sm font-medium text-gray-700">
                Request Body Structure (Predefined)
              </label>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="text-sm font-mono text-gray-800 overflow-x-auto">
{`{
  "remark": "your reference text",
  "description": "your description for this analysis",
  "filedata": "[base64]",
  "fileurl": "https://example.com/files/rekening_bca_202408.pdf",
  "filename": "rekening_bca_202408.pdf",
  "filetype": "pdf",
  "password": "passwordprotected111"
}`}
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This request body structure is predefined by the system and will be used for all endpoints.
            </p>
          </div>

          <ResponseBuilder
            value={responseBody}
            onChange={setResponseBody}
            metadata={metadata}
            onMetadataChange={setMetadata}
          />

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-colors font-medium"
              style={{ backgroundColor: '#1f51fe' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#072ba4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f51fe'}
            >
              <Save size={18} />
              {endpoint ? 'Update Endpoint' : 'Create Endpoint'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
