# Triển khai SportData trên Vercel Hobby

## Kiến trúc khuyến nghị

Dùng hai Vercel Project từ cùng repository:

1. `sportdata-api`: Root Directory là `apps/backend`.
2. `sportdata-web`: Root Directory là `apps/frontend`.

PostgreSQL phải là dịch vụ managed bên ngoài Vercel và nên đặt gần region `sin1`. Không dùng PostgreSQL trong Docker cho deployment Vercel.

Vercel Hobby chỉ phù hợp dự án cá nhân, phi thương mại. Nếu hệ thống được dùng để vận hành sự kiện thương mại, cần kiểm tra lại điều khoản và chuyển sang gói phù hợp.

## Backend

Các biến môi trường tối thiểu:

```dotenv
DATABASE_URL=postgresql://...
NODE_ENV=production
FRONTEND_URLS=https://sportdata-web.vercel.app,https://www.example.com
ALLOW_VERCEL_PREVIEWS=false
BACKEND_PUBLIC_URL=https://sportdata-api.vercel.app
JWT_SECRET=replace-with-at-least-64-random-characters
```

Các biến SMTP, OCR và cổng thanh toán chỉ cần khai báo khi tính năng tương ứng được bật.

Backend chạy thành một NestJS Vercel Function tại Singapore. Build production tự bảo toàn các cột file cũ, chạy Prisma migration rồi chuyển nguồn file còn đọc được sang R2. Preview/development không chạy các bước thay đổi database. Các lần chạy đồng thời được khóa bằng PostgreSQL advisory lock; file đã chuyển được bỏ qua.

```bash
npm run storage:migrate:r2 --workspace=@sportdata/backend
npm run storage:migrate:r2 --workspace=@sportdata/backend -- --apply
```

Hai lệnh trên lần lượt chạy thử và chuyển dữ liệu thủ công; cần build backend trước khi dùng. Trên Vercel, giữ Build Command `npm run vercel-build` theo `apps/backend/vercel.json` và Root Directory `apps/backend`. Trong **Environment Variables → Production**, thêm `STORAGE_DRIVER=r2`, `STORAGE_R2_BUCKET`, `STORAGE_R2_ACCOUNT_ID` (hoặc `STORAGE_R2_ENDPOINT`), `STORAGE_R2_ACCESS_KEY_ID`, `STORAGE_R2_SECRET_ACCESS_KEY` và `SETTINGS_ENCRYPTION_KEY`. Dùng đúng khóa mã hóa của database hiện tại nếu đã lưu credential qua CMS. CMS vẫn ưu tiên hơn ENV.

Build cần truy cập được database và nguồn file cũ. File local trong Docker/máy tính phải được chuyển từ máy đó trước; Vercel không đọc được Docker volume của máy khác. Có thể giữ credentials Cloudinary/S3 để build đọc nguồn cũ. Nguồn ảnh HTTPS được giới hạn bởi `STORAGE_MIGRATION_ALLOWED_HOSTS`. Database local không tự đồng bộ lên database production. Chỉ deploy frontend không chạy migration backend.

Chạy build production lần đầu trong cửa sổ bảo trì để ứng dụng cũ không thay đổi file trong lúc bảo toàn cột legacy. Nếu chuyển một file thất bại, build thất bại và giữ nguyên nguồn/đường dẫn file đó; chạy lại sẽ tiếp tục các file còn lại. `_StorageMigrationFiles` giữ bản sao byte gốc để phục hồi sau migration, không xóa tự động. Những byte đã mất trước đó cần backup hoặc bản gốc; script không tạo ảnh thay thế từ metadata.

## Frontend

Khai báo:

```dotenv
NEXT_PUBLIC_BROWSER_API_URL=https://sportdata-api.vercel.app/api
API_INTERNAL_URL=https://sportdata-api.vercel.app/api
NEXT_PUBLIC_APP_URL=https://sportdata-web.vercel.app
```

`NEXT_PUBLIC_BROWSER_API_URL` giúp trình duyệt gọi thẳng backend, tránh chuyển tiếp mọi request qua Next.js. `API_INTERNAL_URL` vẫn phục vụ các URL `/api/...` tương đối của ảnh và tệp tải xuống.

## Upload ảnh đăng ký

Vercel Function giới hạn request/response 4,5 MB. SportData vì vậy:

- nén ảnh trong trình duyệt xuống khoảng 1 MB;
- tải từng ảnh lên bằng request riêng;
- lưu tạm bằng token dùng một lần trong PostgreSQL;
- gửi request đăng ký cuối dưới dạng JSON nhỏ;
- xóa upload tạm trong cùng transaction khi đăng ký thành công;
- tự dọn upload bỏ dở đã hết hạn khi có lượt upload tiếp theo.

PDF giấy tờ phải nhỏ hơn 3,3 MB. Không tăng `proxyClientMaxBodySize`: cấu hình đó không thể thay đổi giới hạn hạ tầng Vercel.

## Kiểm tra trước khi deploy

```bash
npm run prisma:generate
npm run build:backend
npm run lint --workspace=@sportdata/frontend
npm run build:frontend
```

Sau deployment, kiểm tra:

- `GET https://sportdata-api.vercel.app/api/health/ready` trả `200`;
- frontend tải được danh sách sự kiện;
- đăng ký một VĐV với avatar và hai mặt CCCD;
- đăng ký đoàn nhiều VĐV;
- tải vé PDF và xem ảnh từ đường dẫn `/api/...`.
