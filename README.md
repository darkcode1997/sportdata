# SportData Platform

SportData là nền tảng tổ chức, vận hành và công bố dữ liệu sự kiện thể thao đa môn. Phase 1 tập trung cho thị trường Việt Nam, phục vụ công ty tổ chức sự kiện, liên đoàn, trung tâm, câu lạc bộ và các đơn vị phối hợp thi đấu.

Kiến trúc sản phẩm và lộ trình phát triển được mô tả tại [`docs/product-roadmap.md`](docs/product-roadmap.md).

Hướng dẫn triển khai tiết kiệm tài nguyên trên Vercel Hobby nằm tại [`docs/vercel-hobby.md`](docs/vercel-hobby.md).

## Môi trường chạy

Ba môi trường được cấu hình độc lập:

| Môi trường | Cấu hình | Cách chạy |
| --- | --- | --- |
| Local | `.env` + `docker-compose.yml` | `npm run docker:up` |
| VPS | `.env.production` + `docker-compose.production.yml` | Làm theo `docs/production-runbook.md` |
| Vercel | Biến môi trường cấu hình trên Vercel | Deploy qua Vercel, không dùng Docker Compose |

Không dùng `docker-compose.production.yml` để chạy local. Sao chép `.env.example` thành `.env` cho local hoặc `.env.production` cho VPS; khi dùng VPS, điền phần Docker production và thay các mật khẩu cùng `JWT_SECRET`. Docker local không tự động nạp `.env.production`.

Nền tảng quản lý bộ môn, quốc gia, đơn vị thể thao, sự kiện, đăng ký thi đấu, lịch, kết quả và thống kê thành tích. Dự án gồm:

- Website công khai tại `http://localhost:3000`
- CMS quản trị tại `http://localhost:3000/cms`
- REST API và Swagger tại `http://localhost:4000/api/docs`
- PostgreSQL lưu dữ liệu bền vững

Luồng Phase 1 cho Ju-Jitsu:

- Vận động viên đăng ký/đăng nhập tại `/account/register` và `/account/login`.
- Hồ sơ hỗ trợ VĐV tự do hoặc thuộc liên đoàn/CLB, ảnh đại diện, CCCD hai mặt và hộ chiếu tùy chọn.
- CMS cấu hình cửa sổ đăng ký, lệ phí và hình thức thanh toán trong sự kiện.
- Hệ thống kiểm tra tuổi, giới tính và cân nặng theo hạng đấu trước khi đăng ký.
- Chế độ `FREE` xác nhận lượt thi đấu, tạo `CompetitionEntry` và cấp vé ngay trong `/account`.
- Ban tổ chức đối chiếu giấy tờ và quản lý trạng thái tại `/cms/registrations`.
- Sau khi đăng ký, hệ thống cấp một vé QR riêng cho từng VĐV và cho phép tải PDF ngay. Hồ sơ đội/CLB nhận một PDF nhiều trang gồm trang danh sách đoàn và các vé cá nhân.

### OCR CCCD và hộ chiếu

Đặt `IDENTITY_OCR_ENABLED=true` và cấu hình `FPT_AI_API_KEY` trong `.env` để bật đọc tự động. Khi `IDENTITY_OCR_ENABLED=false`, backend không gọi dịch vụ OCR; ảnh giấy tờ vẫn được lưu, người dùng tiếp tục nhập thông tin và hồ sơ được chuyển sang CMS kiểm duyệt thủ công. Sau khi người dùng chọn ảnh CCCD mặt trước hoặc hộ chiếu, hệ thống hiển thị các trường OCR để sửa và xác nhận trước khi lưu. OCR không tự đánh dấu giấy tờ là hợp lệ; trạng thái xác thực cuối cùng vẫn do CMS hoặc dịch vụ eKYC/NFC quyết định.

### Thanh toán MoMo, VNPAY, VietQR và thẻ quốc tế

- Chuyển khoản `BANK_QR` dùng VietQR và được ADMIN/GAMES_ADMIN đối soát, xác nhận thủ công trong tab đăng ký của sự kiện.
- `MOMO`, `VNPAY` và `VISA` được tạo từ tab Payment của từng sự kiện. `VISA` đi qua luồng thẻ quốc tế `INTCARD` của VNPAY; SportData không thu thập hoặc lưu số thẻ/CVV.
- Mặc định `MOMO_ENABLED=false` và `VNPAY_ENABLED=false`. Điền merchant credentials trong `.env`, cấu hình `BACKEND_PUBLIC_URL` là HTTPS công khai rồi mới bật từng cổng.
- Callback cần khai báo với nhà cung cấp: `POST /api/payments/momo/ipn` và `GET /api/payments/vnpay/ipn`. URL trả người dùng của VNPAY là `GET /api/payments/vnpay/return`.
- Môi trường local không nhận được callback từ Internet. Khi kiểm thử sandbox, dùng một URL HTTPS public/tunnel và cập nhật `BACKEND_PUBLIC_URL`; chỉ IPN có chữ ký hợp lệ mới cập nhật hồ sơ sang `PAID`.

### Các loại tài khoản

- **Cá nhân/VĐV:** tự đăng ký, quản lý hồ sơ định danh, đăng ký cho chính mình và nhận vé cá nhân.
- **Liên đoàn/CLB:** đăng ký người đại diện cho một đơn vị đã tồn tại, chờ SportData duyệt tại `/cms/accounts`, sau đó gửi danh sách VĐV và quản lý bộ vé tại `/federation-account`.
- **Event Manager:** tài khoản nội bộ do SportData cấp và phân quyền trong CMS; không cho phép tự đăng ký công khai.

## Chạy bằng Docker

Yêu cầu Docker Desktop đang hoạt động, sau đó chạy tại thư mục dự án:

```bash
docker compose up --build
```

Nếu máy đang dùng cổng `3000` hoặc `4000`, có thể đổi cổng public trong PowerShell:

```powershell
$env:FRONTEND_HOST_PORT="3001"
$env:BACKEND_HOST_PORT="4001"
docker compose up --build
```

Cổng bên trong Docker không đổi nên website vẫn kết nối API bình thường.

Lần chạy đầu, hệ thống tự tạo cấu trúc cơ sở dữ liệu và tài khoản CMS từ các biến `ADMIN_*` trong `.env`, kể cả khi `SEED_DATABASE=false`. Chỉ nạp dữ liệu mẫu khi đặt `SEED_DATABASE=true`. Mật khẩu của tài khoản đã tồn tại được giữ nguyên; đặt `ADMIN_SYNC_PASSWORD=true` nếu muốn đồng bộ lại mật khẩu từ `.env` khi khởi động backend.

Dừng hệ thống:

```bash
docker compose down
```

Dữ liệu PostgreSQL được giữ trong volume `sportdata_postgres`. Chỉ dùng `docker compose down -v` khi thực sự muốn xóa toàn bộ dữ liệu.

## Chạy ở chế độ phát triển

Sao chép `.env.example` thành `.env`, khởi động PostgreSQL phù hợp với `DATABASE_URL`, rồi chạy:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Trước khi triển khai thật, hãy đổi `JWT_SECRET` và mật khẩu tài khoản quản trị mặc định.
