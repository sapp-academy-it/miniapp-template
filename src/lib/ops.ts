// Client OPS dùng chung cho mọi mini app. Không chứa kiến thức riêng về endpoint nào: đường dẫn do màn hình truyền vào
// (lấy từ tài liệu API trực tuyến). Token chỉ nằm trong bộ nhớ.
import config from '../../app/app.config'

export const OPS_HOST = { dev: 'dev-ops-be.sapp.edu.vn', uat: 'uat-ops-be.sapp.edu.vn', prod: 'ops-be.sapp.edu.vn' }[config.env]
export const API_BASE_URL = `https://${OPS_HOST}/api/v1` // đổi môi trường ở app/app.config.ts (env), CSP connect-src tự khớp theo

let tokens: { act: string; rft: string } | null = null
let rotating: Promise<void> | null = null

export type Ops = {
  list: (path: string, params?: Record<string, string>) => Promise<any[]>
  get: (path: string) => Promise<any>
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
  isLoggedIn: () => Boolean(tokens?.act),
  logout() { tokens = null },
  async login(username: string, password: string) {
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
  if (!tokens) throw new HttpError('Chưa đăng nhập', 401)
  try {
    return await send(path, { bearer: tokens.act })
  } catch (error: any) {
    if (error.status !== 401 || !tokens?.rft) throw error
    try { await rotate() } catch { tokens = null; throw error }
    return send(path, { bearer: tokens!.act })
  }
}

// Mảng dữ liệu của một response danh sách là thuộc tính mảng duy nhất của data (meta/metadata là thông tin phân trang)
function listOf(data: any, path: string): any[] {
  const arrays = Object.entries(data ?? {}).filter(([key, value]) => Array.isArray(value) && key !== 'meta' && key !== 'metadata')
  if (arrays.length !== 1) throw new HttpError(`Không xác định được danh sách trong ${path.split('?')[0]}`)
  return arrays[0][1] as any[]
}

// Lấy đủ mọi trang của endpoint có page_index và page_size. Endpoint không có hai tham số này thì dùng ops.get.
async function fetchAll(path: string, params: Record<string, string> = {}, pageSize = 100) {
  const items: any[] = []
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({ ...params, page_index: String(page), page_size: String(pageSize) })
    const { data } = await api(`${path}?${query}`)
    items.push(...listOf(data, path))
    const meta = data.meta ?? data.metadata // một số endpoint dùng "meta", số khác dùng "metadata"
    if (!meta?.total_pages || page >= meta.total_pages) return items
  }
}

export const ops: Ops = {
  list: (path, params) => fetchAll(path, params),
  get: (path) => api(path).then((r) => r.data),
}
