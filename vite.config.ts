import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function skipVoicesUploaderPlugin(): Plugin {
  return {
    name: 'skip-voices-uploader',
    configureServer(server) {
      server.middlewares.use('/api/upload-skip-voices', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const voices: string[] = Array.isArray(parsed.voices) ? parsed.voices : [];
            if (voices.length === 0) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'No voices provided' }));
              return;
            }
            const cleanVoices = voices.map((v) => (v.includes(',') ? v.split(',')[1] : v));
            const customVoicesPath = path.resolve(__dirname, 'src/utils/customVoicesData.ts');
            if (fs.existsSync(customVoicesPath)) {
              const content = fs.readFileSync(customVoicesPath, 'utf8');
              const updated = content.replace(
                /export const SKIP_VOICES_BASE64:\s*string\[\]\s*=\s*\[[\s\S]*?\];/,
                `export const SKIP_VOICES_BASE64: string[] = ${JSON.stringify(cleanVoices)};`
              );
              fs.writeFileSync(customVoicesPath, updated, 'utf8');
            }
            // Save renamed clean files into public/ as taf1..tafN
            const publicDir = path.resolve(__dirname, 'public');
            cleanVoices.forEach((b64, idx) => {
              const ext = b64.startsWith('UklGR') ? 'wav' : 'mp3';
              const filePath = path.join(publicDir, `taf_${idx + 1}.${ext}`);
              try {
                fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
              } catch {}
            });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, count: cleanVoices.length }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      skipVoicesUploaderPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // إجبار المتصفحات على سحب الملفات الجديدة فوراً وتجاوز الكاش
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
          chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
          assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  };
});
