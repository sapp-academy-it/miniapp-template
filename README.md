# miniapp-template

Bộ khung React + Vite + Tailwind 3.4 + shadcn/ui với giao diện SAPP. Mỗi mini app nội bộ được tạo từ template này ("Use this template") và tự chứa toàn bộ toolchain, lockfile, bộ component và workflow. Skill và agent nằm ở repo `miniapp-skills`.

Chỉ hai thứ thuộc về một app, và là thứ duy nhất trợ lý được sửa: `app/app.config.ts` và `app/screens/<tên>.tsx` (mỗi màn một file tự chứa, `export default` nhận props `ops`, `fmt`, `navigate`).

## Khớp với bản xem trước của LibreChat
- `src/components/ui/`: 37 file, đúng danh sách `sharedFiles` của LibreChat (nhánh `main`), lấy từ registry shadcn kiểu `new-york`, đổi đường dẫn import. Không chép nguyên văn bản của LibreChat nên chi tiết nhỏ có thể khác.
- `package.json`: cùng khoảng phiên bản với `standardDependencies` của LibreChat (`lucide-react` ^0.394, `recharts` 2.12.7, `class-variance-authority` ^0.6, `clsx` ^1.2...). Lockfile ghim phiên bản cụ thể.
- Import dạng `"/components/ui/<tên>"` và `"/lib/utils"` (bí danh trong `vite.config.ts`, `tsconfig.json`).
- Bản xem trước của LibreChat không có theme SAPP (Tailwind CDN, không có biến CSS). Theme nằm ở `tailwind.config.js` + `src/index.css`, chỉ hiện ở bản đăng.

## Client OPS
`src/lib/ops.ts` không chứa kiến thức riêng về endpoint nào: màn hình nhận `ops` qua props và truyền đường dẫn theo tài liệu API trực tuyến. `ops.list(path, params?)` lấy đủ mọi trang của endpoint có `page_index`/`page_size` và tự nhận mảng dữ liệu (thuộc tính mảng duy nhất của `data`, báo lỗi nếu có nhiều mảng); `ops.get(path)` trả về `data`. Client lo đăng nhập, gắn token, đổi token một lần khi hết hạn. Không có chế độ dữ liệu mẫu: dữ liệu mẫu chỉ có trong artifact xem trước.

## Môi trường OPS
Đổi ở `app/app.config.ts` (`env`: `dev`, `uat`, `prod`). Địa chỉ gọi API và `connect-src` của CSP tự khớp (plugin trong `vite.config.ts`). Hai nơi giữ bảng địa chỉ: `src/lib/ops.ts` và `vite.config.ts`. Đổi một nơi thì sửa cả hai.

## Lệnh
- `npm ci`, `npm run build` (tsc + vite build), `npm run lint` (ESLint cho `app/**`), `npm test` (kiểm thử client OPS).
- `.github/workflows/pages.yml`: job `check` (build, lint) chạy trên pull request và `main`; job `deploy` chỉ chạy ở repo của app, sau khi vào `main`.

## Lint (`eslint.config.js`)
Chỉ áp cho mã của app (`app/**`): import chỉ từ thư viện có trong `dependencies`, `"/components/ui/<tên>"` và `"/lib/utils"` (không import tương đối, không `@/`); cấm `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, cookie, `innerHTML`, `dangerouslySetInnerHTML`, `eval`, import động, thẻ `script`/`iframe`; cấm chữ `TODO` và `PREVIEW-ONLY` trong chú thích. Import gói chưa cài thì `tsc` (trong `npm run build`) báo. **Không có gì chặn việc sửa file ngoài `app/`**: quy tắc "chỉ sửa `app/` và `README.md`" là chỉ dẫn trong skill cho agent, cần người duyệt PR nếu muốn chặn thật.

## CSP
`script-src 'self'` (không cho script viết trong trang), `connect-src` chỉ một địa chỉ OPS, `style-src 'self' 'unsafe-inline'`. Cho phép style viết trong trang vì Radix và `react-remove-scroll` tự chèn thẻ `<style>` có nội dung đổi theo độ rộng thanh cuộn của từng trình duyệt, không băm trước được.

## Việc còn dở
- Chưa thử trên GitHub Actions thật và chưa thử trong LibreChat.
