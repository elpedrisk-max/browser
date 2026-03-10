import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import axios from 'axios';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'proxy-plugin',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/proxy')) {
              const urlParams = new URL(req.url, `http://${req.headers.host}`);
              const targetUrl = urlParams.searchParams.get('url');
              
              if (!targetUrl) {
                res.statusCode = 400;
                res.end('URL is required');
                return;
              }

              try {
                // Validate URL format
                new URL(targetUrl);
              } catch (e) {
                res.statusCode = 400;
                res.end('URL inválida');
                return;
              }

              try {
                const response = await axios.get(targetUrl, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
                    "Cache-Control": "max-age=0",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1"
                  },
                  responseType: 'text',
                  timeout: 15000,
                  validateStatus: () => true,
                  maxRedirects: 5
                });

                // Get the final URL after redirects
                const finalTargetUrl = response.request?.res?.responseUrl || targetUrl;

                if (response.status >= 400 && !response.data) {
                  res.statusCode = response.status;
                  res.end(`Error ${response.status}: No se pudo cargar la página.`);
                  return;
                }

                let html = response.data;
                if (typeof html !== 'string') {
                  res.statusCode = 500;
                  res.end("El contenido recibido no es texto válido.");
                  return;
                }

                // Inject base tag using the FINAL URL after redirects
                const urlObj = new URL(finalTargetUrl);
                const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`;
                const baseTag = `<base href="${baseUrl}">`;
                
                if (html.includes('<head>')) {
                  html = html.replace('<head>', `<head>${baseTag}`);
                } else if (html.includes('<HEAD>')) {
                  html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
                } else {
                  html = baseTag + html;
                }
                
                // Remove security headers
                html = html.replace(/<meta http-equiv="Content-Security-Policy".*?>/gi, '');
                html = html.replace(/<meta http-equiv="X-Frame-Options".*?>/gi, '');

                res.setHeader('Content-Type', 'text/html');
                res.end(html);
              } catch (error) {
                console.error("Proxy error:", error);
                res.statusCode = 500;
                res.end("Error fetching the page");
              }
              return;
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
