import type { Endpoint } from '../types/endpoint';

const API_BASE_URL = 'http://localhost:3001/api';

export const endpointApi = {
  async getAll(): Promise<Endpoint[]> {
    const response = await fetch(`${API_BASE_URL}/endpoints`);
    if (!response.ok) {
      throw new Error('Failed to fetch endpoints');
    }
    return response.json();
  },

  async getById(id: string): Promise<Endpoint> {
    const response = await fetch(`${API_BASE_URL}/endpoints/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch endpoint');
    }
    return response.json();
  },

  async create(endpoint: Omit<Endpoint, 'id' | 'createdAt'>): Promise<Endpoint> {
    const response = await fetch(`${API_BASE_URL}/endpoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(endpoint),
    });
    if (!response.ok) {
      throw new Error('Failed to create endpoint');
    }
    return response.json();
  },

  async update(id: string, endpoint: Omit<Endpoint, 'id' | 'createdAt'>): Promise<Endpoint> {
    const response = await fetch(`${API_BASE_URL}/endpoints/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(endpoint),
    });
    if (!response.ok) {
      throw new Error('Failed to update endpoint');
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/endpoints/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete endpoint');
    }
  },
};
