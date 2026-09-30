# SportData Platform

SportData là nền tảng tổ chức, vận hành và công bố dữ liệu sự kiện thể thao đa môn. Phase 1 tập trung cho thị trường Việt Nam, phục vụ công ty tổ chức sự kiện, liên đoàn, trung tâm, câu lạc bộ và các đơn vị phối hợp thi đấu.

Kiến trúc sản phẩm và lộ trình phát triển được mô tả tại [`docs/product-roadmap.md`](docs/product-roadmap.md).

## Môi trường chạy

Ba môi trường được cấu hình độc lập:

| Môi trường | Cấu hình | Cách chạy |
| --- | --- | --- |
| Local | `.env` + `docker-compose.yml` | `npm run docker:up` |
| VPS | `.env.production` + `docker-compose.production.yml` | Làm theo `docs/production-runbook.md` |
| Vercel | Biến môi trường cấu hình trên Vercel | Deploy qua Vercel, không dùng Docker Compose |

Không dùng `docker-compose.production.yml` để chạy local. File `.env.production.example` chỉ là mẫu cho VPS và không được Docker local tự động nạp.

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

Lần chạy đầu, hệ thống tự tạo cấu trúc cơ sở dữ liệu. Chỉ nạp dữ liệu mẫu khi đặt `SEED_DATABASE=true`. Tài khoản CMS local mặc định được cấu hình trong `.env`.

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
