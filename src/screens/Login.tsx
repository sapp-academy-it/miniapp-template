import { useState } from 'react'
import { session } from '@/lib/ops'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import config from '../../app/app.config'

export default function Login({ message, onDone }: { message?: string; onDone: () => void }) {
  const [error, setError] = useState(message ?? '')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget          // giữ lại trước khi await (React xoá currentTarget sau đó)
    const form = new FormData(formEl)
    setBusy(true); setError('')
    try {
      await session.login(String(form.get('username')), String(form.get('password')))
      onDone()
    } catch (err: any) {
      setError(err.status === 401 ? 'Sai tên đăng nhập hoặc mật khẩu' : 'Không kết nối được hệ thống')
    } finally {
      setBusy(false)
      formEl.reset()   // xoá mật khẩu khỏi ô nhập
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-800">SAPP Academy · Nội bộ</p>
      <h1 className="text-3xl font-bold text-zinc-900">{config.title}</h1>
      <span className="mt-3 block h-1 w-12 bg-amber-500" />
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5"><Label htmlFor="u">Tên đăng nhập</Label><Input id="u" name="username" autoComplete="username" required /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="p">Mật khẩu</Label><Input id="p" name="password" type="password" autoComplete="current-password" required /></div>
        <Button type="submit" disabled={busy}>Đăng nhập</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  )
}
