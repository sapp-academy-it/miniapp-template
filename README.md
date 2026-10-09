# miniapp-template

Bộ khung React + Vite + Tailwind 3.4 + shadcn/ui với giao diện SAPP. Mỗi mini app nội bộ được tạo từ template này ("Use this template") và tự chứa toàn bộ toolchain, lockfile, bộ component và workflow. Skill và agent nằm ở repo `miniapp-skills`.

Chỉ hai thứ thuộc về một app, và là thứ duy nhất trợ lý được sửa: `app/app.config.ts` và `app/screens/<tên>.tsx` (mỗi màn một file tự chứa, `export default` nhận props `ops`, `fmt`, `navigate`).

## Khớp với bản xem trước của LibreChat
- `src/components/ui/`: 37 file, đúng danh sách `sharedFiles` của LibreChat (nhánh `main`), lấy từ registry shadcn kiểu `new-york`, đổi đường dẫn import. Không chép nguyên văn bản của LibreChat nên chi tiết nhỏ có thể khác.
- `package.json`: cùng khoảng phiên bản với `standardDependencies` của LibreChat (`lucide-react` ^0.394, `recharts` 2.12.7, `class-variance-authority` ^0.6, `clsx` ^1.2...). Lockfile ghim phiên bản cụ thể.
- Import dạng `"/components/ui/<tên>"` và `"/lib/utils"` (bí danh trong `vite.config.ts`, `tsconfig.json`).
- Bản xem trước của LibreChat không có theme SAPP (Tailwind CDN, không có biến CSS). Theme nằm ở `tailwind.config.js` + `src/index.css`, chỉ hiện ở bản đăng.

## Môi trường OPS
Đổi ở `app/app.config.ts` (`env`: `dev`, `uat`, `prod`). Địa chỉ gọi API và `connect-src` của CSP tự khớp (plugin trong `vite.config.ts`). Ba nơi giữ bảng địa chỉ: `src/lib/ops.ts`, `vite.config.ts`, `scripts/check-app.mjs`. Đổi một nơi thì sửa cả ba.

## Lệnh
- `npm ci`, `npm run build` (tsc + vite build), `npm run check` (check-app), `npm test` (kiểm thử check-app và client OPS).
- `.github/workflows/pages.yml`: job `check` (build, check-app) chạy trên pull request và `main`; job `deploy` chỉ chạy ở repo của app, sau khi vào `main`.

## `check-app`
Chỉ cho sửa `app/**` và `README.md`; import theo danh sách cho phép; cấm `dangerouslySetInnerHTML`, `fetch`, lưu trong trình duyệt, địa chỉ lạ; kiểm tra CSP của bản build. Đây là lưới chặn lỗi vô ý, không chặn được người cố tình sửa chính script (cần người duyệt PR).

## CSP
`script-src 'self'` (không cho script viết trong trang), `connect-src` chỉ một địa chỉ OPS, `style-src 'self' 'unsafe-inline'`. Cho phép style viết trong trang vì Radix và `react-remove-scroll` tự chèn thẻ `<style>` có nội dung đổi theo độ rộng thanh cuộn của từng trình duyệt, không băm trước được.

## Việc còn dở
- Chưa thử trên GitHub Actions thật và chưa thử trong LibreChat.
