import { useState, type ComponentType } from 'react'
import { LogOut } from 'lucide-react'
import { ops, session, IS_PREVIEW } from '@/lib/ops'
import { fmt } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Login from '@/screens/Login'
import config from '../app/app.config'

export type Navigate = (name: string, params?: Record<string, unknown>) => void
type ScreenProps = { ops: typeof ops; fmt: typeof fmt; navigate: Navigate }
type Screen = ComponentType<ScreenProps>

// Mỗi file app/screens/<tên>.tsx là một màn hình, tên màn là tên file
const modules = import.meta.glob('../app/screens/*.tsx', { eager: true }) as Record<string, { default: Screen }>
const screens: Record<string, Screen> = Object.fromEntries(
  Object.entries(modules).map(([path, m]) => [path.split('/').pop()!.replace('.tsx', ''), m.default]),
)

export default function App() {
  const [view, setView] = useState<{ name: string; params?: Record<string, unknown> }>({ name: session.isLoggedIn() ? config.home : 'login' })
  const navigate: Navigate = (name, params) => setView(!session.isLoggedIn() && name !== 'login' ? { name: 'login', params } : { name, params })

  if (view.name === 'login') return <Login message={view.params?.message as string | undefined} onDone={() => navigate(config.home)} />

  const Current = screens[view.name]
  return (
    <div className="container py-6">
      {IS_PREVIEW && (
        <div className="mb-4 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm">
          Bản xem trước: {ops.isDemo ? 'đang dùng DỮ LIỆU MẪU.' : 'đang gọi API thật.'}{' '}
          <Button variant="outline" size="sm" onClick={() => { session.setDemo(!ops.isDemo); navigate('login') }}>
            {ops.isDemo ? 'Thử gọi API thật' : 'Quay lại dữ liệu mẫu'}
          </Button>
        </div>
      )}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-800">SAPP Academy · Nội bộ</p>
          <h1 className="text-3xl font-bold text-zinc-900">{config.title}</h1>
          <span className="mt-3 block h-1 w-12 bg-amber-500" />
        </div>
        <Button variant="outline" onClick={() => { session.logout(); navigate('login') }}>
          <LogOut /> Đăng xuất
        </Button>
      </header>
      {config.tabs.length > 1 && (
        <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-border">
          {config.tabs.map(([name, label]) => (
            <button key={name} onClick={() => navigate(name)}
              className={cn('min-h-11 whitespace-nowrap border-b-4 px-4 font-semibold', name === view.name ? 'border-amber-500 text-zinc-800' : 'border-transparent text-zinc-600')}>
              {label}
            </button>
          ))}
        </nav>
      )}
      {Current ? <Current ops={ops} fmt={fmt} navigate={navigate} /> : <p className="text-destructive">Không tìm thấy màn hình "{view.name}".</p>}
    </div>
  )
}
