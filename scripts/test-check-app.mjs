// Thử check-app.mjs: bản hợp lệ phải đạt, mỗi kiểu vi phạm phải bị bắt đúng lý do.
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const script = join(repo, 'scripts/check-app.mjs')
const GOOD_SCREEN = `import { useState } from "react"
import { Button } from "/components/ui/button"
export default function Home({ ops, fmt, navigate }: any) {
  const [n, setN] = useState(0)
  return <Button onClick={() => setN(n + 1)}>{fmt.date(null)} {n}</Button>
}
`
const CSP = (connect, script = "'self'", style = "'self' 'unsafe-inline'") => `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${script}; style-src ${style}; connect-src ${connect}; base-uri 'none'">`

function fixture(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'check-app-test-'))
  cpSync(join(repo, 'package.json'), join(dir, 'package.json'))
  cpSync(join(repo, 'src/components/ui'), join(dir, 'src/components/ui'), { recursive: true })
  mkdirSync(join(dir, 'app/screens'), { recursive: true })
  writeFileSync(join(dir, 'app/screens/home.tsx'), GOOD_SCREEN)
  writeFileSync(join(dir, 'app/app.config.ts'), `export default { title: 'Thử', env: 'uat' as 'dev' | 'uat' | 'prod', home: 'home', tabs: [] as [string, string][] }\n`)
  mkdirSync(join(dir, 'dist'), { recursive: true })
  writeFileSync(join(dir, 'dist/index.html'), `<!doctype html><html><head>${CSP('https://uat-ops-be.sapp.edu.vn')}</head><body></body></html>`)
  const env = { changed: 'app/screens/home.tsx\napp/app.config.ts' }
  mutate?.(dir, env, { write: (rel, text) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), text) } })
  return { dir, env }
}

function run({ dir, env }) {
  const result = spawnSync(process.execPath, [script, dir], { encoding: 'utf8', env: { ...process.env, CHANGED_FILES: env.changed } })
  rmSync(dir, { recursive: true, force: true })
  return { status: result.status, out: result.stdout + result.stderr }
}

const screen = (code) => (dir, _e, { write }) => write('app/screens/home.tsx', code)
const cases = [
  ['hợp lệ', null, null],
  ['sửa file ngoài app/', (d, e) => { e.changed += '\nsrc/lib/ops.ts' }, 'không được sửa file này'],
  ['sửa package.json', (d, e) => { e.changed += '\npackage.json' }, 'không được sửa file này'],
  ['file lạ trong app/', (d, e, { write }) => write('app/helpers.ts', 'export const a = 1\n'), 'chỉ được có app/app.config.ts'],
  ['tên màn hình sai', (d, e, { write }) => write('app/screens/Báo Giá.tsx', GOOD_SCREEN), 'tên màn hình chỉ gồm'],
  ['màn login', (d, e, { write }) => write('app/screens/login.tsx', GOOD_SCREEN), 'dành riêng'],
  ['dangerouslySetInnerHTML', screen(GOOD_SCREEN + 'const x = <div dangerouslySetInnerHTML={{ __html: "a" }} />\n'), 'dangerouslySetInnerHTML'],
  ['fetch trực tiếp', screen(GOOD_SCREEN + 'fetch("/x")\n'), 'fetch()'],
  ['localStorage', screen(GOOD_SCREEN + 'localStorage.setItem("a", "b")\n'), 'lưu dữ liệu trong trình duyệt'],
  ['eval', screen(GOOD_SCREEN + 'eval("1")\n'), 'eval()'],
  ['import @/ bị cấm', screen('import { cn } from "@/lib/utils"\n' + GOOD_SCREEN), 'import "@/lib/utils" không được phép'],
  ['import lib/ops', screen('import { ops } from "/lib/ops"\n' + GOOD_SCREEN), 'import "/lib/ops" không được phép'],
  ['import tương đối', screen('import x from "./other"\n' + GOOD_SCREEN), 'tự chứa'],
  ['thư viện chưa cài', screen('import z from "zod"\n' + GOOD_SCREEN), 'chưa được cài'],
  ['component không có', screen('import { Foo } from "/components/ui/foo"\n' + GOOD_SCREEN), 'component không có trong template'],
  ['import() động', screen(GOOD_SCREEN + 'const m = import("react")\n'), 'import() động'],
  ['địa chỉ lạ', screen(GOOD_SCREEN + 'const u = "https://evil.example.com/x"\n'), 'địa chỉ lạ: evil.example.com'],
  ['còn khối PREVIEW-ONLY', screen(GOOD_SCREEN + '// === PREVIEW-ONLY ===\n'), 'PREVIEW-ONLY'],
  ['thiếu export default', screen('export const A = () => null\n'), 'thiếu "export default"'],
  ['home không có file', (d, e, { write }) => write('app/app.config.ts', `export default { title: 'T', env: 'uat', home: 'khac', tabs: [] }\n`), 'home "khac"'],
  ['tab không có file', (d, e, { write }) => write('app/app.config.ts', `export default { title: 'T', env: 'uat', home: 'home', tabs: [['ma', 'Mã']] }\n`), 'tab "ma"'],
  ['env sai', (d, e, { write }) => write('app/app.config.ts', `export default { title: 'T', env: 'live', home: 'home', tabs: [] }\n`), 'env phải là'],
  ['CSP script unsafe-inline', (d, e, { write }) => write('dist/index.html', `<html><head>${CSP('https://uat-ops-be.sapp.edu.vn', "'self' 'unsafe-inline'")}</head></html>`), "script-src phải đúng"],
  ['CSP connect lạ', (d, e, { write }) => write('dist/index.html', `<html><head>${CSP('https://evil.example.com')}</head></html>`), 'không phải OPS'],
  ['CSP style-src dùng *', (d, e, { write }) => write('dist/index.html', `<html><head>${CSP('https://uat-ops-be.sapp.edu.vn', "'self'", "'self' *")}</head></html>`), 'dùng ký tự *'],
  ['CSP thiếu', (d, e, { write }) => write('dist/index.html', '<html><head></head></html>'), 'thiếu thẻ Content-Security-Policy'],
]

let bad = 0
for (const [name, mutate, expected] of cases) {
  const { status, out } = run(fixture(mutate))
  const ok = expected === null ? status === 0 : status === 1 && out.includes(expected)
  if (!ok) { bad++; console.log(`LỖI: "${name}" ${expected === null ? 'lẽ ra phải đạt' : `lẽ ra phải báo "${expected}"`}\n${out}`) }
}
if (bad) { console.log(`KHÔNG ĐẠT: ${bad}/${cases.length} ca sai`); process.exit(1) }
console.log(`ĐẠT: ${cases.length}/${cases.length} ca của check-app`)
