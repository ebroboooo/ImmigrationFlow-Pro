import type { Plugin } from 'vite';
import { handleGeminiRoute } from './geminiHandler.ts';

function attachGeminiMiddleware(server: {
  middlewares: {
    use: (
      path: string,
      handler: (
        req: import('node:http').IncomingMessage,
        res: import('node:http').ServerResponse,
        next: () => void,
      ) => void,
    ) => void;
  };
}): void {
  server.middlewares.use('/api/ai/gemini', (req, res, _next) => {
    const suffix = req.url ?? '';
    void handleGeminiRoute(req, res, `/api/ai/gemini${suffix}`).catch((err) => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }));
    });
  });
}

export function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-proxy',
    configureServer(server) {
      attachGeminiMiddleware(server);
    },
    configurePreviewServer(server) {
      attachGeminiMiddleware(server);
    },
  };
}
