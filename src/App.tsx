import { useState, useEffect } from 'react';
import { Endpoint } from './types/endpoint';
import { useLocalStorage } from './hooks/useLocalStorage';
import { EndpointList } from './components/EndpointList';
import { EndpointTable } from './components/EndpointTable';
import { EndpointForm } from './components/EndpointForm';
import { EndpointTester } from './components/EndpointTester';
import { Plus, Server, Grid, Table } from 'lucide-react';
import { endpointApi } from './services/api';

function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'table'>('view-mode', 'grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | undefined>();
  const [testingEndpoint, setTestingEndpoint] = useState<Endpoint | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    try {
      const data = await endpointApi.getAll();
      setEndpoints(data);
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (endpointData: Omit<Endpoint, 'id' | 'createdAt'>) => {
    try {
      if (editingEndpoint) {
        await endpointApi.update(editingEndpoint.id, endpointData);
      } else {
        await endpointApi.create(endpointData);
      }
      await loadEndpoints();
      setIsFormOpen(false);
      setEditingEndpoint(undefined);
    } catch (error) {
      console.error('Failed to save endpoint:', error);
      alert('Failed to save endpoint. Please try again.');
    }
  };


  const handleEdit = (endpoint: Endpoint) => {
    setEditingEndpoint(endpoint);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this endpoint?')) {
      try {
        await endpointApi.delete(id);
        await loadEndpoints();
      } catch (error) {
        console.error('Failed to delete endpoint:', error);
        alert('Failed to delete endpoint. Please try again.');
      }
    }
  };

  const handleTest = (endpoint: Endpoint) => {
    setTestingEndpoint(endpoint);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEndpoint(undefined);
  };

  const handleCloseTest = () => {
    setTestingEndpoint(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#1f51fe' }}></div>
          <p className="mt-4 text-gray-600">Loading endpoints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl shadow-lg" style={{ backgroundColor: '#1f51fe' }}>
                <Server className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">API Endpoint Manager</h1>
                <p className="text-gray-600 mt-1">
                  Create, test, and manage your dynamic API endpoints
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-3 flex items-center gap-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={viewMode === 'grid' ? { backgroundColor: '#1f51fe' } : {}}
                >
                  <Grid size={18} />
                  <span className="text-sm font-medium">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-3 flex items-center gap-2 transition-colors ${
                    viewMode === 'table'
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={viewMode === 'table' ? { backgroundColor: '#1f51fe' } : {}}
                >
                  <Table size={18} />
                  <span className="text-sm font-medium">Table</span>
                </button>
              </div>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                style={{ backgroundColor: '#1f51fe' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#072ba4'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f51fe'}
              >
                <Plus size={20} />
                New Endpoint
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Endpoints</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{endpoints.length}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(31, 81, 254, 0.1)' }}>
                <Server style={{ color: '#1f51fe' }} size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">GET Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {endpoints.filter((e) => e.method === 'GET').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <div className="text-emerald-600 font-bold text-sm">GET</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">POST Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {endpoints.filter((e) => e.method === 'POST').length}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(7, 43, 164, 0.1)' }}>
                <div style={{ color: '#072ba4' }} className="font-bold text-sm">POST</div>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <EndpointList
            endpoints={endpoints}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTest={handleTest}
          />
        ) : (
          <EndpointTable
            endpoints={endpoints}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTest={handleTest}
          />
        )}

        {isFormOpen && (
          <EndpointForm
            endpoint={editingEndpoint}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        )}

        {testingEndpoint && (
          <EndpointTester endpoint={testingEndpoint} onClose={handleCloseTest} />
        )}
      </div>
    </div>
  );
}

export default App;
