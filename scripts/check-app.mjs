// Kiểm tra mini app trước khi đăng: chỉ sửa trong app/, import đúng danh sách cho phép, cấm các cách viết nguy hiểm, CSP của bản build.
// Chạy trong workflow (job "check") sau tsc và build. Lỗi thì workflow dừng, trang đang chạy giữ nguyên bản cũ.
// Đây là lưới chặn lỗi vô ý của trợ lý, không chặn được người cố tình sửa chính file này (cần người duyệt PR để chặn).
// Dùng: node scripts/check-app.mjs [thư mục gốc repo]. Danh sách file đổi lấy từ biến CHANGED_FILES hoặc git diff với nhánh đích của PR.
// Đường dẫn trong ops.list/ops.get được đối chiếu với tài liệu API trực tuyến (công khai, không cần đăng nhập). Không tải được tài liệu thì chỉ cảnh báo.
// Biến thử nghiệm: OPS_DOCS_JSON (đường dẫn file tài liệu), OPS_DOCS_URL (địa chỉ tài liệu).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.argv[2] ?? '.'
const OPS_HOSTS = ['dev-ops-be.sapp.edu.vn', 'uat-ops-be.sapp.edu.vn', 'ops-be.sapp.edu.vn']
const OK_HOSTS = [...OPS_HOSTS, 'sapp-academy-it.github.io', 'sapp.edu.vn', 'www.sapp.edu.vn', 'www.w3.org']
const ENVS = ['dev', 'uat', 'prod']
const DOCS_HOST = { dev: 'dev-ops-be.sapp.edu.vn', uat: 'uat-ops-be.sapp.edu.vn', prod: 'uat-ops-be.sapp.edu.vn' } // production không có tài liệu, dùng của UAT
const errors = []
const warnings = []
const fail = (file, message) => errors.push(`${file}: ${message}`)

const BANNED = [
  [/dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML'],
  [/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/, 'innerHTML, outerHTML hoặc insertAdjacentHTML'],
  [/\beval\s*\(/, 'eval()'], [/new\s+Function\s*\(/, 'new Function()'], [/document\.write\s*\(/, 'document.write()'],
  [/\bfetch\s*\(/, 'fetch() (chỉ gọi dữ liệu qua props ops)'], [/XMLHttpRequest|WebSocket|EventSource|sendBeacon/, 'gọi mạng trực tiếp (chỉ gọi dữ liệu qua props ops)'],
  [/document\.cookie/, 'cookie'], [/\b(?:localStorage|sessionStorage|indexedDB)\b/, 'lưu dữ liệu trong trình duyệt (token chỉ nằm trong bộ nhớ)'],
  [/<\s*(?:script|iframe|object|embed)\b/i, 'thẻ script, iframe, object hoặc embed'], [/\bimport\s*\(/, 'import() động'],
  [/\brequire\s*\(/, 'require()'],
]

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

function changedFiles() {
  if (process.env.CHANGED_FILES !== undefined) return process.env.CHANGED_FILES.split('\n').map((s) => s.trim()).filter(Boolean)
  const base = process.env.GITHUB_BASE_REF
  if (!base) return null // chạy trên máy hoặc trên main: không có nhánh đích để so
  const run = spawnSync('git', ['diff', '--name-only', `origin/${base}...HEAD`], { cwd: ROOT, encoding: 'utf8' })
  if (run.status !== 0) { fail('.', `không đọc được danh sách file đổi: ${run.stderr.trim()}`); return null }
  return run.stdout.split('\n').filter(Boolean)
}

// ---- 1) Chỉ được sửa app/** và README.md (nhánh PR)
const changed = changedFiles()
if (changed) for (const f of changed) if (!/^app\//.test(f) && f !== 'README.md') fail(f, 'không được sửa file này (chỉ được sửa app/ và README.md)')

// ---- 2) Cấu trúc thư mục app/
const appFiles = walk(join(ROOT, 'app')).map((f) => relative(ROOT, f).split('\\').join('/'))
const screens = []
for (const f of appFiles) {
  const m = f.match(/^app\/screens\/([^/]+)\.tsx$/)
  if (m) {
    if (!/^[a-z][a-z0-9-]*$/.test(m[1])) fail(f, 'tên màn hình chỉ gồm chữ thường, số, dấu gạch ngang, bắt đầu bằng chữ')
    else if (m[1] === 'login') fail(f, 'tên "login" dành riêng cho màn đăng nhập của khung')
    else screens.push(m[1])
  } else if (f !== 'app/app.config.ts') fail(f, 'chỉ được có app/app.config.ts và app/screens/<tên>.tsx (mỗi màn hình một file tự chứa)')
}
if (!screens.length) fail('app/screens', 'chưa có màn hình nào')

// ---- 3) Nội dung từng file trong app/
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const deps = new Set(Object.keys(pkg.dependencies ?? {}))
const uiFile = (name) => ['.tsx', '.ts'].some((ext) => existsSync(join(ROOT, 'src/components/ui', name + ext)))

for (const f of appFiles.filter((x) => /\.tsx?$/.test(x))) {
  const code = readFileSync(join(ROOT, f), 'utf8')
  for (const [re, name] of BANNED) if (re.test(code)) fail(f, `dùng ${name}, không được phép`)
  const left = code.match(/PREVIEW-ONLY|dán nguyên khối|TODO|Lorem ipsum/i)
  if (left) fail(f, `còn chữ giữ chỗ hoặc khối xem trước "${left[0]}" (xoá khối PREVIEW-ONLY khi đưa vào repo)`)
  for (const m of code.matchAll(/https?:\/\/([^/"'`\s)<>:$;,]+)/g)) if (!OK_HOSTS.includes(m[1])) fail(f, `có địa chỉ lạ: ${m[1]}`)
  for (const m of code.matchAll(/(?:\bfrom|\bimport)\s*["']([^"']+)["']/g)) {
    const spec = m[1]
    if (spec.startsWith('/components/ui/')) { if (!uiFile(spec.slice('/components/ui/'.length))) fail(f, `component không có trong template: ${spec}`) }
    else if (spec === '/lib/utils') continue
    else if (spec.startsWith('/') || spec.startsWith('@/')) fail(f, `import "${spec}" không được phép (chỉ "/components/ui/<tên>", "/lib/utils" và thư viện đã cài)`)
    else if (spec.startsWith('.')) fail(f, `import "${spec}": mỗi màn hình phải tự chứa, không import file khác`)
    else if (!deps.has(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])) fail(f, `thư viện "${spec}" chưa được cài trong template`)
  }
  if (f.startsWith('app/screens/') && !/export\s+default\b/.test(code)) fail(f, 'thiếu "export default" cho màn hình')
}

// ---- 4) app.config.ts: tên màn, môi trường (đọc bằng bộ biên dịch TypeScript của chính repo)
let config
if (existsSync(join(ROOT, 'app/app.config.ts'))) {
  try {
    const ts = (await import('typescript')).default
    const js = ts.transpileModule(readFileSync(join(ROOT, 'app/app.config.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
    config = (await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)).default
    if (typeof config?.title !== 'string' || !config.title.trim()) fail('app/app.config.ts', 'thiếu title')
    if (!ENVS.includes(config?.env)) fail('app/app.config.ts', `env phải là một trong: ${ENVS.join(', ')}`)
    if (!screens.includes(config?.home)) fail('app/app.config.ts', `home "${config?.home}" không có file app/screens/${config?.home}.tsx`)
    for (const tab of Array.isArray(config?.tabs) ? config.tabs : []) {
      if (!screens.includes(tab?.[0])) fail('app/app.config.ts', `tab "${tab?.[0]}" không có file app/screens/${tab?.[0]}.tsx`)
    }
    if (!Array.isArray(config?.tabs)) fail('app/app.config.ts', 'thiếu tabs (có thể là mảng rỗng)')
  } catch (error) {
    fail('app/app.config.ts', `không đọc được cấu hình: ${error.message}`)
  }
} else fail('app/app.config.ts', 'thiếu file')

// ---- 5) Đường dẫn trong ops.list/ops.get phải có trong tài liệu API trực tuyến (chỉ GET). Đường dẫn ghép bằng ${...} thì bỏ qua.
const literalCalls = []
for (const f of appFiles.filter((x) => /\.tsx?$/.test(x))) {
  const code = readFileSync(join(ROOT, f), 'utf8')
  for (const m of code.matchAll(/\bops\s*\.\s*(list|get)\s*\(\s*(["'`])((?:(?!\2)[^\\$])*)\2/g)) literalCalls.push({ f, path: m[3].split('?')[0] })
}
if (literalCalls.length) {
  try {
    const docUrl = process.env.OPS_DOCS_URL ?? `https://${DOCS_HOST[config?.env] ?? DOCS_HOST.uat}/api/v1/miniapp-docs-json`
    const doc = process.env.OPS_DOCS_JSON ? JSON.parse(readFileSync(process.env.OPS_DOCS_JSON, 'utf8'))
      : await fetch(docUrl, { signal: AbortSignal.timeout(10000) }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
    const getPaths = Object.entries(doc.paths ?? {}).filter(([, item]) => item.get).map(([p]) => p.replace(/^\/api\/v\d+/, ''))
    if (!getPaths.length) throw new Error('tài liệu không có đường dẫn GET nào')
    const matchers = getPaths.map((p) => new RegExp('^' + p.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+') + '$'))
    for (const { f, path } of literalCalls) {
      if (!matchers.some((re) => re.test(path))) fail(f, `endpoint "${path}" không có trong tài liệu API (chỉ GET). Đọc lại tài liệu API trực tuyến, đừng đoán đường dẫn`)
    }
  } catch (error) {
    warnings.push(`không tải được tài liệu API (${error.message}): bỏ qua bước đối chiếu endpoint`)
  }
}

// ---- 6) Bản build: CSP phải chặt và chỉ gọi OPS
const distHtml = join(ROOT, 'dist/index.html')
if (existsSync(distHtml)) {
  const html = readFileSync(distHtml, 'utf8')
  const csp = html.match(/<meta[^>]*Content-Security-Policy[^>]*content="([^"]*)"/i)
  if (!csp) fail('dist/index.html', 'thiếu thẻ Content-Security-Policy')
  else {
    const directive = (name) => csp[1].split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' ')) ?? ''
    const script = directive('script-src')
    if (script !== "script-src 'self'") fail('dist/index.html', `CSP script-src phải đúng "'self'", đang là: ${script || '(thiếu)'}`)
    const connect = directive('connect-src')
    const hosts = [...connect.matchAll(/https?:\/\/([^\s/]+)/g)].map((m) => m[1])
    if (!connect) fail('dist/index.html', 'CSP thiếu connect-src')
    if (hosts.length !== 1) fail('dist/index.html', `connect-src phải có đúng một địa chỉ OPS, đang có ${hosts.length}`)
    for (const h of hosts) if (!OPS_HOSTS.includes(h)) fail('dist/index.html', `connect-src có địa chỉ không phải OPS: ${h}`)
    if (/(?:script|style)-src[^;]*\*/.test(csp[1])) fail('dist/index.html', 'CSP dùng ký tự * (cho phép mọi nguồn)')
  }
  if (/<script[^>]+src=["']https?:/i.test(html)) fail('dist/index.html', 'có script nạp từ địa chỉ ngoài')
}

for (const w of warnings) console.log(`::warning::${w}`)
if (errors.length) {
  for (const e of errors) console.log(`::error::${e}`)
  console.log(`\nKHÔNG ĐẠT: ${errors.length} vấn đề. Trang đang chạy được giữ nguyên bản cũ.`)
  process.exit(1)
}
console.log('ĐẠT: phạm vi sửa, import, cách viết bị cấm, endpoint theo tài liệu API, cấu hình app và CSP của bản build.')
