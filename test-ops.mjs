import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = join(mkdtempSync(join(tmpdir(), 'ops-')), 'ops.mjs')
await build({ entryPoints: ['src/lib/ops.ts'], bundle: true, format: 'esm', outfile: out, logLevel: 'error' })

// ---- Trang đã đăng: mở trực tiếp (self === top), hostname không phải localhost
const win = {}; win.self = win; win.top = win
globalThis.window = win
globalThis.location = { hostname: 'sapp-academy-it.github.io' }
const log = []
let valid = 'A1', rot = 0
globalThis.fetch = async (url, init = {}) => {
  const path = url.replace('https://uat-ops-be.sapp.edu.vn/api/v1', ''); const auth = init.headers?.Authorization
  log.push(`${init.method ?? 'GET'} ${path.split('?')[0]}`)
  const r = (s, b) => ({ status: s, ok: s < 400, json: async () => b })
  if (path === '/auth/login') return r(200, { data: { staff: { username: 'u' }, tokens: { act: 'A1', rft: 'R1' } } })
  if (path === '/auth/rotate') { if (auth !== 'Bearer R1') return r(401, {}); rot++; await new Promise((x) => setTimeout(x, 15)); valid = 'A2'; return r(200, { data: { tokens: { act: 'A2', rft: 'R2' } } }) }
  if (path.startsWith('/classes')) { if (auth !== `Bearer ${valid}`) return r(401, {}); const pg = +new URL(url).searchParams.get('page_index'); return r(200, { data: { meta: { total_pages: 2 }, classes: [{ code: `REAL${pg}` }] } }) }
  if (path.startsWith('/payment-products')) return r(200, { data: { metadata: { total_pages: 1 }, products: [{ name: 'P' }] } })
  return r(404, {})
}

const { ops, session, IS_PREVIEW } = await import(pathToFileURL(out).href)
assert.equal(IS_PREVIEW, false); assert.equal(session.isDemo(), false)
await assert.rejects(ops.list('/classes', 'classes'), { status: 401 })       // chưa đăng nhập
await session.login('u', 'p'); assert.ok(session.isLoggedIn())
assert.deepEqual((await ops.list('/classes', 'classes')).map((c) => c.code), ['REAL1', 'REAL2'])   // nhiều trang, key meta
assert.equal((await ops.list('/payment-products', 'products')).length, 1)                           // key metadata
valid = 'A2'                                                                                       // token hết hạn phía server
const res = await Promise.all([1, 2, 3].map(() => ops.list('/classes', 'classes')))
assert.equal(res.length, 3); assert.equal(rot, 1, `rotate phải gọi 1 lần, thực tế ${rot}`)
valid = 'A3'; await assert.rejects(ops.list('/classes', 'classes'), { status: 401 }); assert.equal(session.isLoggedIn(), false)
assert.ok(!log.some((l) => /DEMO/.test(l)))
console.log('ĐẠT: client OPS bản TypeScript (đăng nhập, phân trang, rotate đúng 1 lần cho 3 request song song, hết phiên)')

// ---- Xem trước trong iframe: dùng dữ liệu mẫu, không gọi mạng
const calls0 = log.length
const w2 = {}; w2.self = w2; w2.top = {}
globalThis.window = w2
const mod2 = await import(pathToFileURL(out).href + '?preview')
assert.equal(mod2.IS_PREVIEW, true); assert.equal(mod2.session.isDemo(), true)
await mod2.session.login('x', 'y')
const classes = await mod2.ops.list('/classes', 'classes')
assert.ok(classes.length && classes.every((c) => /DEMO/.test(c.code)))
assert.equal(log.length, calls0, 'xem trước không được gọi mạng')
console.log('ĐẠT: chế độ xem trước dùng dữ liệu mẫu, không gọi mạng')
