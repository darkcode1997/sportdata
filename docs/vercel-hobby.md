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

Backend chạy thành một NestJS Vercel Function tại Singapore. Migration không chạy trong build để tránh preview deployment đồng thời thay đổi production database. Trước khi promote bản có migration mới, chạy từ môi trường tin cậy:

```bash
npm run prisma:deploy
```

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
