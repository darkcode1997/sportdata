# SportData Platform

Nền tảng theo dõi hồ sơ vận động viên, lịch thi đấu, kết quả và thống kê thành tích. Dự án gồm:

- Website công khai tại `http://localhost:3000`
- CMS quản trị tại `http://localhost:3000/cms`
- REST API và Swagger tại `http://localhost:4000/api/docs`
- PostgreSQL lưu dữ liệu bền vững

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

Lần chạy đầu, hệ thống tự tạo cấu trúc cơ sở dữ liệu và nạp bộ dữ liệu mẫu. Tài khoản CMS mẫu:

```text
Email: admin@sportdata.vn
Mật khẩu: admin123
```

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
