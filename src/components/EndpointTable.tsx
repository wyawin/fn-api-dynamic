import { Endpoint } from '../types/endpoint';
import { Trash2, Edit, Play, FileDown } from 'lucide-react';
import { generateApiDocumentationPDF } from '../utils/pdfExport';

interface EndpointTableProps {
  endpoints: Endpoint[];
  onEdit: (endpoint: Endpoint) => void;
  onDelete: (id: string) => void;
  onTest: (endpoint: Endpoint) => void;
}

export function EndpointTable({ endpoints, onEdit, onDelete, onTest }: EndpointTableProps) {
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Path
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {endpoints.map((endpoint) => (
              <tr key={endpoint.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{endpoint.name}</div>
                  {endpoint.description && (
                    <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{endpoint.description}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getMethodColor(endpoint.method)}`}
                    style={getMethodStyle(endpoint.method)}
                  >
                    {endpoint.method}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                    {endpoint.path}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    endpoint.statusCode >= 200 && endpoint.statusCode < 300
                      ? 'bg-green-100 text-green-700'
                      : endpoint.statusCode >= 400
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {endpoint.statusCode}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-500">
                    {new Date(endpoint.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onTest(endpoint)}
                      className="p-2 text-white rounded-lg transition-colors"
                      style={{ backgroundColor: '#1f51fe' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#072ba4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f51fe'}
                      title="Test"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => onEdit(endpoint)}
                      className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(endpoint.id)}
                      className="p-2 bg-gray-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
