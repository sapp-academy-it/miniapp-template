// Client OPS dùng chung cho mọi mini app (bản TypeScript của api-client.js đã kiểm thử).
// Token chỉ nằm trong bộ nhớ. Bản xem trước (trong iframe hoặc localhost) tự dùng dữ liệu mẫu.

import config from '../../app/app.config'

export const OPS_HOST = { dev: 'dev-ops-be.sapp.edu.vn', uat: 'uat-ops-be.sapp.edu.vn', prod: 'ops-be.sapp.edu.vn' }[config.env]
export const API_BASE_URL = `https://${OPS_HOST}/api/v1` // đổi môi trường ở app/app.config.ts (env), CSP connect-src tự khớp theo
export const IS_PREVIEW = window.self !== window.top || ['localhost', '127.0.0.1', ''].includes(location.hostname)

let useDemo = IS_PREVIEW
let tokens: { act: string; rft: string } | null = null
let rotating: Promise<void> | null = null
let demoSession = false

export type Ops = {
  list: (path: string, key: string, params?: Record<string, string>) => Promise<any[]>
  get: (path: string) => Promise<any>
  isDemo: boolean
}

class HttpError extends Error {
  status?: number
  constructor(message: string, status?: number) { super(message); this.status = status }
}

async function send(path: string, init: { method?: string; body?: unknown; bearer?: string } = {}) {
  const res = await fetch(API_BASE_URL + path, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(init.bearer ? { Authorization: `Bearer ${init.bearer}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status)
  return res.json()
}

export const session = {
  isDemo: () => useDemo,
  isLoggedIn: () => (useDemo ? demoSession : Boolean(tokens?.act)),
  logout() { tokens = null; demoSession = false },
  setDemo(v: boolean) { useDemo = v; this.logout() },
  async login(username: string, password: string) {
    if (useDemo) { demoSession = true; return { username: username || 'demo' } }
    const { data } = await send('/auth/login', { method: 'POST', body: { username, password } })
    tokens = data.tokens
    return data.staff
  },
}

function rotate() {
  rotating ??= send('/auth/rotate', { method: 'POST', bearer: tokens!.rft })
    .then(({ data }) => { tokens = data.tokens })
    .finally(() => { rotating = null })
  return rotating
}

async function api(path: string) {
  if (useDemo) {
    if (!demoSession) throw new HttpError('Chưa đăng nhập', 401)
    return demoResponse(path)
  }
  if (!tokens) throw new HttpError('Chưa đăng nhập', 401)
  try {
    return await send(path, { bearer: tokens.act })
  } catch (error: any) {
    if (error.status !== 401 || !tokens?.rft) throw error
    try { await rotate() } catch { tokens = null; throw error }
    return send(path, { bearer: tokens!.act })
  }
}

async function fetchAll(path: string, key: string, params: Record<string, string> = {}, pageSize = 100) {
  const items: any[] = []
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({ ...params, page_index: String(page), page_size: String(pageSize) })
    const { data } = await api(`${path}?${query}`)
    items.push(...data[key])
    const meta = data.meta ?? data.metadata // /classes dùng "meta", các endpoint còn lại dùng "metadata"
    if (page >= meta.total_pages) return items
  }
}

export const ops: Ops = {
  list: (path, key, params) => fetchAll(path, key, params),
  get: (path) => api(path).then((r) => r.data),
  get isDemo() { return useDemo },
}

// ----- Dữ liệu MẪU: chỉ để xem trước, luôn gắn nhãn MẪU/DEMO, không bao giờ hiện trên trang đã đăng -----
function demoResponse(path: string): any {
  const meta = { total_records: 2, total_pages: 1, page_index: 1, page_size: 100 }
  const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString()
  const hn = { id: 'demo-f1', name: 'Cơ sở MẪU Hà Nội' }
  if (path.startsWith('/classes')) return { success: true, data: { meta, classes: [
    { id: 'demo-c1', code: 'DEMO-L1-01', name: 'Lớp MẪU 1', status: 'PUBLIC', instruction_mode: 'LIVE_ONLINE', opening_at: day(14), facility: null, course: { subject: { name: 'CFA-Level-1' }, course_categories: [{ name: 'CFA' }] } },
    { id: 'demo-c2', code: 'DEMO-L2-01', name: 'Lớp MẪU 2', status: 'PUBLIC', instruction_mode: 'OFFLINE', opening_at: day(30), facility: hn, course: { subject: { name: 'CFA-Level-2' }, course_categories: [{ name: 'CFA' }] } },
  ] } }
  if (path.startsWith('/facilities')) return { success: true, data: { metadata: meta, facilities: [{ ...hn, code: 'DEMO-HN', address: 'Địa chỉ MẪU', status: 'ACTIVE', ward: { province: { name: 'Hà Nội' } } }] } }
  if (path.startsWith('/payment-products')) return { success: true, data: { metadata: meta, products: [{ id: 'demo-p1', name: 'Sản phẩm MẪU Level 1', price: '10000000', status: 'ACTIVE', construction_mode: 'LIVE_ONLINE', subject: { code: 'CFA-Level-1' }, course_category: { name: 'CFA' } }] } }
  if (path.startsWith('/payment-combos')) return { success: true, data: { metadata: meta, combos: [{ id: 'demo-b1', name: 'Combo MẪU', status: 'ACTIVE', auto_price: '18000000', custom_price: null, products: [] }] } }
  throw new HttpError('Không có dữ liệu mẫu cho ' + path, 404)
}
