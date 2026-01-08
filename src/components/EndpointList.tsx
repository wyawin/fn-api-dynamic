import { Endpoint } from '../types/endpoint';
import { Trash2, Edit, Play, FileDown } from 'lucide-react';
import { generateApiDocumentationPDF } from '../utils/pdfExport';

interface EndpointListProps {
  endpoints: Endpoint[];
  onEdit: (endpoint: Endpoint) => void;
  onDelete: (id: string) => void;
  onTest: (endpoint: Endpoint) => void;
}

export function EndpointList({ endpoints, onEdit, onDelete, onTest }: EndpointListProps) {
  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      POST: 'border border-[#1f51fe]',
      PUT: 'border border-[#fad85a]',
      PATCH: 'bg-orange-100 text-orange-700 border-orange-200',
      DELETE: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getMethodStyle = (method: string) => {
    if (method === 'POST') {
      return { backgroundColor: 'rgba(31, 81, 254, 0.1)', color: '#1f51fe' };
    }
    if (method === 'PUT') {
      return { backgroundColor: 'rgba(250, 216, 90, 0.2)', color: '#072ba4' };
    }
    return {};
  };

  if (endpoints.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-gray-500 text-lg">No endpoints created yet. Create your first endpoint to get started!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your API Endpoints</h2>
          <p className="text-sm text-gray-600 mt-1">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button
          onClick={() => void generateApiDocumentationPDF(endpoints)}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          style={{ backgroundColor: '#1f51fe' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#072ba4'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f51fe'}
        >
          <FileDown size={18} />
          Export API Documentation
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {endpoints.map((endpoint) => (
        <div
          key={endpoint.id}
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getMethodColor(endpoint.method)}`}
                    style={getMethodStyle(endpoint.method)}
                  >
                    {endpoint.method}
                  </span>
                  <span className="text-xs text-gray-500">
                    {endpoint.statusCode}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{endpoint.name}</h3>
                <code className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  {endpoint.path}
                </code>
              </div>
            </div>

            {endpoint.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{endpoint.description}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span>Predefined Request Body</span>
              <span>•</span>
              <span>{new Date(endpoint.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onTest(endpoint)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-white rounded-lg transition-colors text-sm font-medium"
                style={{ backgroundColor: '#1f51fe' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#072ba4'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f51fe'}
              >
                <Play size={14} />
                Test
              </button>
              <button
                onClick={() => onEdit(endpoint)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDelete(endpoint.id)}
                className="px-3 py-2 bg-gray-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
