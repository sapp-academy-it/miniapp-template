import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "/components/ui/select"
import { Label } from "/components/ui/label"
import { Button } from "/components/ui/button"
import { Skeleton } from "/components/ui/skeleton"

const MODE_LABEL: Record<string, string> = { ONLINE: "Record Online", LIVE_ONLINE: "Live Online", OFFLINE: "Face to face" } // suy luận, chưa được nghiệp vụ xác nhận
const levelOf = (c: any): string | null => c.course?.subject?.name?.match(/Level[- ]?(\d)/i)?.[1] ?? null

type Props = {
  ops: {
    list: (path: string, params?: Record<string, string>) => Promise<any[]>
    get: (path: string) => Promise<any>
  }
  fmt: {
    date: (iso?: string | null) => string
    vnd: (v?: string | number | null) => string
    percent: (x: number) => string
  }
  navigate: (name: string, params?: Record<string, unknown>) => void
}

function ScheduleScreen({ ops, fmt, navigate }: Props) {
  const [classes, setClasses] = useState<any[]>([])
  const [province, setProvince] = useState<Record<string, string>>({})
  const [level, setLevel] = useState("all")
  const [mode, setMode] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = () => {
    setLoading(true); setError("")
    Promise.all([
      ops.list("/classes", { status: "PUBLIC" }),
      ops.list("/facilities", { status: "ACTIVE" }),
    ]).then(([cls, fac]) => {
      setProvince(Object.fromEntries(fac.map((f) => [f.id, f.ward?.province?.name ?? ""])))
      // Lớp sắp khai giảng: lọc ở trình duyệt vì fromDate/toDate của API lọc theo ngày cập nhật
      setClasses(cls.filter((c) => c.opening_at && new Date(c.opening_at) > new Date()).sort((a, b) => +new Date(a.opening_at) - +new Date(b.opening_at)))
    }).catch((e) => {
      if (e.status === 401) return navigate("login", { message: "Phiên đăng nhập đã hết hạn" })
      setError(e.status === 403 ? "Tài khoản của bạn chưa có quyền xem dữ liệu này" : "Không tải được dữ liệu. Vui lòng thử lại")
    }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const rows = classes.filter((c) => (level === "all" || levelOf(c) === level) && (mode === "all" || c.instruction_mode === mode))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex w-full flex-col gap-1.5 sm:w-48">
          <Label>Level</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="1">Level 1</SelectItem>
              <SelectItem value="2">Level 2</SelectItem>
              <SelectItem value="3">Level 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-48">
          <Label>Hình thức</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="ONLINE">Record Online</SelectItem>
              <SelectItem value="LIVE_ONLINE">Live Online</SelectItem>
              <SelectItem value="OFFLINE">Face to face</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      ) : error ? (
        <p className="py-8 text-center text-destructive">{error} <Button variant="outline" size="sm" onClick={load}>Thử lại</Button></p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-zinc-600">Chưa có lớp phù hợp</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã lớp</TableHead><TableHead>Level</TableHead><TableHead>Hình thức</TableHead><TableHead>Khu vực</TableHead>
                <TableHead className="text-right">Khai giảng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.code}</TableCell>
                  <TableCell>{levelOf(c) ?? "—"}</TableCell>
                  <TableCell>{MODE_LABEL[c.instruction_mode] ?? c.instruction_mode}</TableCell>
                  <TableCell>{province[c.facility?.id] || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt.date(c.opening_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default ScheduleScreen
