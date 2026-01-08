import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'endpoints.json');

app.use(cors());
app.use(express.json());

interface Endpoint {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  responseBody: string;
  statusCode: number;
  createdAt: string;
}

const ensureDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
  }
};

const readEndpoints = async (): Promise<Endpoint[]> => {
  await ensureDataFile();
  const data = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeEndpoints = async (endpoints: Endpoint[]): Promise<void> => {
  await fs.writeFile(DATA_FILE, JSON.stringify(endpoints, null, 2));
};

app.get('/api/endpoints', async (req: Request, res: Response) => {
  try {
    const endpoints = await readEndpoints();
    res.json(endpoints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read endpoints' });
  }
});

app.get('/api/endpoints/:id', async (req: Request, res: Response) => {
  try {
    const endpoints = await readEndpoints();
    const endpoint = endpoints.find((ep) => ep.id === req.params.id);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.json(endpoint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read endpoint' });
  }
});

app.post('/api/endpoints', async (req: Request, res: Response) => {
  try {
    const endpoints = await readEndpoints();
    const newEndpoint: Endpoint = {
      ...req.body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    endpoints.push(newEndpoint);
    await writeEndpoints(endpoints);
    res.status(201).json(newEndpoint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

app.put('/api/endpoints/:id', async (req: Request, res: Response) => {
  try {
    const endpoints = await readEndpoints();
    const index = endpoints.findIndex((ep) => ep.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    const updatedEndpoint = {
      ...req.body,
      id: req.params.id,
      createdAt: endpoints[index].createdAt,
    };
    endpoints[index] = updatedEndpoint;
    await writeEndpoints(endpoints);
    res.json(updatedEndpoint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

app.delete('/api/endpoints/:id', async (req: Request, res: Response) => {
  try {
    const endpoints = await readEndpoints();
    const filteredEndpoints = endpoints.filter((ep) => ep.id !== req.params.id);
    if (filteredEndpoints.length === endpoints.length) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    await writeEndpoints(filteredEndpoints);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
