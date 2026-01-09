import { useState } from 'react';
import { Endpoint, PredefinedRequestBody } from '../types/endpoint';
import { X, Send, Copy, Check } from 'lucide-react';

interface EndpointTesterProps {
  endpoint: Endpoint;
  onClose: () => void;
}

export function EndpointTester({ endpoint, onClose }: EndpointTesterProps) {
  const [requestData, setRequestData] = useState<Partial<PredefinedRequestBody>>({
    remark: '',
    description: '',
    filedata: '',
    fileurl: '',
    filename: '',
    filetype: 'pdf',
    password: '',
  });
  const [response, setResponse] = useState<string>('');
  const [showResponse, setShowResponse] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actualStatusCode, setActualStatusCode] = useState<number | null>(null);

  const handleFieldChange = (fieldName: keyof PredefinedRequestBody, value: string) => {
    setRequestData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const url = `http://localhost:3001${endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`}`;

      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (endpoint.method !== 'GET') {
        options.body = JSON.stringify(requestData);
      }

      const res = await fetch(url, options);
      setActualStatusCode(res.status);

      const data = await res.json();
      const formattedResponse = JSON.stringify(data, null, 2);
      setResponse(formattedResponse);
      setShowResponse(true);
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Failed to make request'}`);
      setShowResponse(true);
      setActualStatusCode(null);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      POST: 'bg-blue-100 text-blue-700 border-blue-200',
      PUT: 'bg-amber-100 text-amber-700 border-amber-200',
      PATCH: 'bg-orange-100 text-orange-700 border-orange-200',
      DELETE: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${getMethodColor(endpoint.method)}`}>
              {endpoint.method}
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{endpoint.name}</h2>
              <code className="text-sm text-gray-600">{endpoint.path}</code>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Request Body</h3>
                <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                  JSON
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remark
                    <span className="text-gray-500 text-xs ml-2">(string)</span>
                  </label>
                  <input
                    type="text"
                    value={requestData.remark}
                    onChange={(e) => handleFieldChange('remark', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your reference text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                    <span className="text-gray-500 text-xs ml-2">(string)</span>
                  </label>
                  <textarea
                    value={requestData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                    placeholder="Your description for this analysis"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Data
                    <span className="text-gray-500 text-xs ml-2">(base64 string)</span>
                  </label>
                  <textarea
                    value={requestData.filedata}
                    onChange={(e) => handleFieldChange('filedata', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                    rows={3}
                    placeholder="[base64]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File URL
                    <span className="text-gray-500 text-xs ml-2">(string)</span>
                  </label>
                  <input
                    type="url"
                    value={requestData.fileurl}
                    onChange={(e) => handleFieldChange('fileurl', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/files/rekening_bca_202408.pdf"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filename
                    <span className="text-gray-500 text-xs ml-2">(string)</span>
                  </label>
                  <input
                    type="text"
                    value={requestData.filename}
                    onChange={(e) => handleFieldChange('filename', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="rekening_bca_202408.pdf"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Type
                    <span className="text-gray-500 text-xs ml-2">(string)</span>
                  </label>
                  <input
                    type="text"
                    value={requestData.filetype}
                    onChange={(e) => handleFieldChange('filetype', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="pdf"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                    <span className="text-gray-500 text-xs ml-2">(string)</span>
                  </label>
                  <input
                    type="text"
                    value={requestData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="passwordprotected111"
                  />
                </div>
              </div>

              <button
                onClick={handleTest}
                disabled={loading}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Request
                  </>
                )}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Response</h3>
                {showResponse && (
                  <button
                    onClick={copyResponse}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              {showResponse ? (
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      (actualStatusCode || endpoint.statusCode) >= 200 && (actualStatusCode || endpoint.statusCode) < 300
                        ? 'bg-green-500 text-white'
                        : (actualStatusCode || endpoint.statusCode) >= 400
                        ? 'bg-red-500 text-white'
                        : 'bg-yellow-500 text-white'
                    }`}>
                      {actualStatusCode || endpoint.statusCode}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(actualStatusCode || endpoint.statusCode) >= 200 && (actualStatusCode || endpoint.statusCode) < 300
                        ? 'Success'
                        : (actualStatusCode || endpoint.statusCode) >= 400
                        ? 'Error'
                        : 'Redirect'}
                    </span>
                  </div>
                  <pre className="text-green-400 text-sm overflow-x-auto">
                    <code>{response}</code>
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 text-sm">Send a request to see the response</p>
                </div>
              )}

              {endpoint.description && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Description</h4>
                  <p className="text-sm text-blue-700">{endpoint.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
