import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Joi from 'joi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'endpoints.json');

app.use(cors());
app.use(express.json());

interface ResponseMetadata {
  fields: Record<string, {
    type?: string;
    description?: string;
    decimalPlaces?: number;
    choices?: string[];
  }>;
}

interface Endpoint {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  responseBody: string;
  metadata?: ResponseMetadata;
  statusCode: number;
  createdAt: string;
}

const endpointSchema = Joi.object({
  name: Joi.string().required().min(1).max(200).trim(),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').required(),
  path: Joi.string().required().min(1).max(500).trim().custom((value, helpers) => {
    if (!value.startsWith('/')) {
      return '/' + value;
    }
    return value;
  }),
  description: Joi.string().allow('').max(1000).trim(),
  responseBody: Joi.string().required().min(1),
  metadata: Joi.object({
    fields: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        type: Joi.string().optional(),
        description: Joi.string().optional(),
        decimalPlaces: Joi.number().optional(),
        choices: Joi.array().items(Joi.string()).optional()
      })
    )
  }).optional(),
  statusCode: Joi.number().integer().min(100).max(599).required(),
});

const predefinedRequestBodySchema = Joi.object({
  remark: Joi.string().allow('').optional(),
  description: Joi.string().required(),
  filedata: Joi.string().required(),
  fileurl: Joi.string().required(),
  filename: Joi.string().required(),
  filetype: Joi.string().required().max(10),
  password: Joi.string().allow('').optional(),
});

let dynamicRouter = Router();

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

const parseResponseBody = (responseBody: string): any => {
  try {
    return JSON.parse(responseBody);
  } catch {
    return responseBody;
  }
};

const loadDynamicRoutes = async () => {
  dynamicRouter = Router();

  try {
    const endpoints = await readEndpoints();

    endpoints.forEach((endpoint) => {
      const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
      const routePath = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;

      dynamicRouter[method](routePath, (req: Request, res: Response) => {
        if (method !== 'get') {
          const { error } = predefinedRequestBodySchema.validate(req.body);
          if (error) {
            return res.status(400).json({
              error: 'Validation failed',
              details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
            });
          }
        }

        const responseData = parseResponseBody(endpoint.responseBody);
        res.status(endpoint.statusCode).json(responseData);
      });

      console.log(`Registered ${endpoint.method} ${routePath}`);
    });
  } catch (error) {
    console.error('Failed to load dynamic routes:', error);
  }
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
    const { error, value } = endpointSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    const endpoints = await readEndpoints();
    const newEndpoint: Endpoint = {
      ...value,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    endpoints.push(newEndpoint);
    await writeEndpoints(endpoints);
    await loadDynamicRoutes();
    res.status(201).json(newEndpoint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

app.put('/api/endpoints/:id', async (req: Request, res: Response) => {
  try {
    const { error, value } = endpointSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    const endpoints = await readEndpoints();
    const index = endpoints.findIndex((ep) => ep.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    const updatedEndpoint = {
      ...value,
      id: req.params.id,
      createdAt: endpoints[index].createdAt,
    };
    endpoints[index] = updatedEndpoint;
    await writeEndpoints(endpoints);
    await loadDynamicRoutes();
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
    await loadDynamicRoutes();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

app.use((req: Request, res: Response, next) => {
  dynamicRouter(req, res, next);
});

const startServer = async () => {
  await loadDynamicRoutes();

  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log('Management API available at /api/endpoints');
    console.log('Dynamic endpoints loaded and ready');
  });
};

startServer();
