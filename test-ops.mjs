import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = join(mkdtempSync(join(tmpdir(), 'ops-')), 'ops.mjs')
await build({ entryPoints: ['src/lib/ops.ts'], bundle: true, format: 'esm', outfile: out, logLevel: 'error' })

const log = []
let valid = 'A1', rot = 0
globalThis.fetch = async (url, init = {}) => {
  const path = url.replace('https://uat-ops-be.sapp.edu.vn/api/v1', ''); const auth = init.headers?.Authorization
  log.push(`${init.method ?? 'GET'} ${path.split('?')[0]}`)
  const r = (s, b) => ({ status: s, ok: s < 400, json: async () => b })
  const page = +new URL(url).searchParams.get('page_index')
  if (path === '/auth/login') return r(200, { data: { staff: { username: 'u' }, tokens: { act: 'A1', rft: 'R1' } } })
  if (path === '/auth/rotate') { if (auth !== 'Bearer R1') return r(401, {}); rot++; await new Promise((x) => setTimeout(x, 15)); valid = 'A2'; return r(200, { data: { tokens: { act: 'A2', rft: 'R2' } } }) }
  if (auth !== `Bearer ${valid}`) return r(401, {})
  // endpoint nào cũng được: client không biết trước tên endpoint hay tên mảng dữ liệu
  if (path.startsWith('/alpha')) return r(200, { data: { meta: { total_pages: 2 }, rows: [{ code: `A${page}` }] } })        // phân trang, "meta"
  if (path.startsWith('/beta')) return r(200, { data: { metadata: { total_pages: 1 }, things: [{ name: 'B' }] } })         // "metadata"
  if (path.startsWith('/flat')) return r(200, { data: { entries: [{ id: 1 }, { id: 2 }] } })                              // không có thông tin phân trang
  if (path.startsWith('/ambiguous')) return r(200, { data: { metadata: { total_pages: 1 }, xs: [1], ys: [2] } })          // hai mảng: không đoán
  if (path.startsWith('/single')) return r(200, { data: { id: 7, name: 'Một bản ghi' } })
  return r(404, {})
}

const { ops, session } = await import(pathToFileURL(out).href)
await assert.rejects(ops.list('/alpha'), { status: 401 })                                           // chưa đăng nhập
await session.login('u', 'p'); assert.ok(session.isLoggedIn())
assert.deepEqual((await ops.list('/alpha')).map((c) => c.code), ['A1', 'A2'])                       // tự nhận mảng "rows", nhiều trang
assert.equal((await ops.list('/beta', { status: 'ACTIVE' })).length, 1)                             // tự nhận mảng "things", "metadata"
assert.equal((await ops.list('/flat')).length, 2)                                                   // không có meta: dừng sau trang đầu
await assert.rejects(ops.list('/ambiguous'), /Không xác định được danh sách/)                       // hai mảng thì báo lỗi, không đoán
assert.deepEqual(await ops.get('/single'), { id: 7, name: 'Một bản ghi' })
assert.ok(log.includes('GET /beta'))
valid = 'A2'                                                                                        // token hết hạn phía server
const res = await Promise.all([1, 2, 3].map(() => ops.list('/alpha')))
assert.equal(res.length, 3); assert.equal(rot, 1, `rotate phải gọi 1 lần, thực tế ${rot}`)
valid = 'A3'; await assert.rejects(ops.list('/alpha'), { status: 401 }); assert.equal(session.isLoggedIn(), false)
console.log('ĐẠT: client OPS bản TypeScript (đăng nhập, tự nhận mảng dữ liệu, phân trang, rotate đúng 1 lần cho 3 request song song, hết phiên)')
