// Hàm định dạng tiếng Việt dùng chung. Màn hình nhận chúng qua props `fmt`, không import trực tiếp.
export const fmt = {
  date: (iso?: string | null) => (iso ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)) : '—'),
  vnd: (v?: string | number | null) => (v == null || v === '' ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(v))),
  percent: (x: number) => new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(x),
}
export type Fmt = typeof fmt
