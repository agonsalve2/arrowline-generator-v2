import { defineConfig, type Plugin } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PRESETS_FILE = path.resolve(__dirname, 'public/presets.json');

function presetsApiPlugin(): Plugin {
  return {
    name: 'presets-api',
    configureServer(server) {
      server.middlewares.use('/api/presets', async (req, res) => {
        try {
          if (req.method === 'GET') {
            let body = '[]';
            try {
              body = await fs.readFile(PRESETS_FILE, 'utf8');
            } catch (err: any) {
              if (err.code !== 'ENOENT') throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(body);
            return;
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            const raw = Buffer.concat(chunks).toString('utf8');
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'expected array' }));
              return;
            }
            await fs.mkdir(path.dirname(PRESETS_FILE), { recursive: true });
            const tmp = `${PRESETS_FILE}.tmp`;
            await fs.writeFile(tmp, JSON.stringify(parsed, null, 2), 'utf8');
            await fs.rename(tmp, PRESETS_FILE);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, count: parsed.length }));
            return;
          }

          res.statusCode = 405;
          res.end();
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err?.message ?? err) }));
        }
      });
    },
  };
}

export default defineConfig({
  root: '.',
  plugins: [presetsApiPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/public/presets.json'],
    },
  },
  build: {
    outDir: 'dist',
  },
});
