import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const kit = path.resolve(__dirname)
const app = path.resolve(kit, 'app')

// connect-src của CSP lấy theo env trong app/app.config.ts (cùng bảng với OPS_HOST ở src/lib/ops.ts và OPS_HOSTS ở scripts/check-app.mjs)
const OPS_HOSTS: Record<string, string> = { dev: 'dev-ops-be.sapp.edu.vn', uat: 'uat-ops-be.sapp.edu.vn', prod: 'ops-be.sapp.edu.vn' }
const opsHost = {
  name: 'ops-host-csp',
  transformIndexHtml(html: string) {
    const env = readFileSync(path.join(app, 'app.config.ts'), 'utf8').match(/\benv:\s*['"](dev|uat|prod)['"]/)?.[1]
    if (!env) throw new Error('app/app.config.ts: thiếu env (dev, uat hoặc prod)')
    return html.replace('%OPS_HOST%', OPS_HOSTS[env])
  },
}

export default defineConfig({
  root: kit,
  base: './', // trang nằm dưới /<tên-repo>/ trên GitHub Pages
  plugins: [react(), opsHost],
  resolve: {
    alias: [
      // Màn hình viết theo quy ước của LibreChat: import từ "/components/ui/..." và "/lib/..."
      { find: /^\/components\//, replacement: `${kit}/src/components/` },
      { find: /^\/lib\//, replacement: `${kit}/src/lib/` },
      { find: /^@\//, replacement: `${kit}/src/` },
      { find: /^app\//, replacement: `${app}/` },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: { fs: { allow: [kit] } },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
})
