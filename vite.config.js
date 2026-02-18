import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'api-dev',
        configureServer(server) {
          server.middlewares.use('/api/categorize', async (req, res) => {
            // Parse request body
            let body = ''
            for await (const chunk of req) body += chunk
            try { req.body = JSON.parse(body) } catch { req.body = {} }

            // Expose the key from .env to the handler via process.env
            if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY

            // Express-compatible res wrapper for the handler
            const send = (code, data) => {
              res.writeHead(code, { 'content-type': 'application/json' })
              res.end(JSON.stringify(data))
            }
            const mockRes = { status: code => ({ json: data => send(code, data) }) }

            const handlerUrl = new URL('./api/categorize.js', import.meta.url).href
            const { default: handler } = await import(handlerUrl)
            await handler(req, mockRes)
          })
        },
      },
    ],
  }
})
