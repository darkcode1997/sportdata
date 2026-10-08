# SportData production runbook

Ứng dụng triển khai với service `backend` (NestJS) và `frontend` (Next.js), phía trước là Nginx. Backend tự khởi động phần xử lý vé/email nền cùng server. File local của backend lưu trong volume `sportdata_storage` tại `/app/storage`.

## Điều kiện trước khi chạy

- Domain đã trỏ về máy chủ và hai file TLS nằm tại `deploy/certs/fullchain.pem`, `deploy/certs/privkey.pem`.
- Sao chép `.env.example` thành `.env.production`, điền các biến trong phần **Docker production** và thay toàn bộ giá trị `replace-with-*` cùng `JWT_SECRET`. Compose tự đặt URL nội bộ, URL HTTPS và đường dẫn storage cho container.
- Không dùng mật khẩu hoặc JWT secret của môi trường phát triển.
- Máy chủ có Docker Compose, tối thiểu hai vùng lưu trữ độc lập cho database và backup.
- Alertmanager đã có receiver email/webhook thực tế.

## Khởi động

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Chỉ Nginx mở cổng public. Prometheus, Grafana và Alertmanager chỉ bind vào loopback để truy cập qua SSH tunnel hoặc VPN.

Nếu chuyển từ cấu hình hai backend/frontend trước đây, dùng cùng Compose project và chạy:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build --remove-orphans
docker compose --env-file .env.production -f docker-compose.production.yml restart nginx prometheus
```

Lệnh đầu xóa container `backend-1`, `backend-2`, `frontend-1`, `frontend-2`, `ticket-email-worker` cũ và tạo `backend`, `frontend`. Lệnh sau nạp lại cấu hình proxy và monitoring. Volume database và file upload được giữ nguyên. Có gián đoạn ngắn khi chuyển đổi hoặc cập nhật ứng dụng vì mỗi service chỉ có một instance.

## PostgreSQL và PITR

Primary bật WAL archive, replica nhận streaming replication và `postgres-base-backup` tạo base backup hằng ngày. Trước go-live phải diễn tập restore sang một máy chủ riêng:

1. Dừng ghi ứng dụng hoặc chọn recovery timestamp.
2. Khôi phục base backup gần nhất.
3. Cấu hình `restore_command` đọc WAL từ volume/object storage.
4. Đặt `recovery_target_time`, tạo `recovery.signal` và khởi động PostgreSQL.
5. Chạy kiểm tra số lượng Event, Entry, Match, ResultRevision và AuditLog.

Volume cùng một máy chủ không phải bản backup thảm họa. Đồng bộ base backup và WAL sang object storage có versioning/immutability hoặc dùng PostgreSQL managed có HA/PITR.

## Hàng đợi gửi vé

Migration `20261008100000_ticket_email_jobs` tạo bảng `TicketEmailJob`. API lưu tác vụ trong cùng transaction với đăng ký/xác nhận hồ sơ, trả response với `ticketEmailSent: false` và `ticketEmailQueued: true` khi đã xếp hàng. Backend tự khởi động `TicketEmailWorkerService` sau khi ứng dụng khởi tạo. Service kiểm tra hàng đợi mỗi giây khi rảnh và xử lý tuần tự việc tải ảnh, dựng PDF và gửi SMTP; HTTP handler không chờ các bước này.

Áp dụng migration bằng `npm run prisma:deploy`, rồi khởi động backend bằng lệnh thông thường (`npm run dev:backend`, `npm run dev` hoặc Docker Compose). Không cần lệnh hay container email riêng. Backend dừng lấy tác vụ mới khi shutdown và chờ tác vụ đang xử lý hoàn tất trước khi đóng kết nối database; Compose cho backend tối đa 2 phút để dừng. Khi backend dừng đột ngột, tác vụ còn trong DB để phục hồi lần khởi động tiếp theo. PDF chạy trong cùng tiến trình backend nên cũng dùng CPU của server.

Cơ chế polling này cần backend chạy liên tục, như Node server hoặc Docker. Khi triển khai serverless, tác vụ lưu trong DB vẫn còn nhưng timer nền có thể bị ngắt khi instance ngừng chạy; không dùng cấu hình này để bảo đảm giao email trên serverless.

Worker kiểm tra lại điều kiện phát hành vé trước khi gửi. Vé bị hủy/xóa hoặc tính năng email đang tắt/SMTP chưa cấu hình được đánh dấu `SKIPPED`. Lỗi tải dữ liệu, dựng PDF hoặc SMTP được thử lại tối đa 5 lần, với thời gian chờ 30, 60, 120 và 240 giây. Tác vụ đang xử lý được gia hạn khóa mỗi 30 giây; nếu worker dừng đột ngột, worker khác có thể lấy lại sau 5 phút. Khóa hàng bằng `FOR UPDATE SKIP LOCKED` cho phép chạy nhiều worker.

Theo dõi `TicketEmailJob.status`, `attempts`, `lastError` và `sentAt`, cùng log `TicketEmailWorkerService` của backend. Sau khi sửa nguyên nhân, có thể chạy SQL sau để thử lại các tác vụ đã lỗi:

```sql
UPDATE "TicketEmailJob"
SET "status" = 'PENDING', "attempts" = 0, "availableAt" = NOW(),
    "lockedAt" = NULL, "lockToken" = NULL, "lastError" = NULL, "updatedAt" = NOW()
WHERE "status" = 'FAILED';
```

SMTP không có transaction chung với PostgreSQL: nếu SMTP đã nhận thư nhưng worker dừng trước khi ghi `SENT`, tác vụ có thể gửi lại thư khi phục hồi. Theo dõi và xóa tác vụ `SENT`/`SKIPPED` cũ theo thời hạn lưu trữ vận hành.

Kiểm tra hồi quy sau build bằng `node --test apps/backend/scripts/smoke-ticket-email.mjs`: đăng ký cá nhân/khách/đoàn, CMS duyệt, rollback nếu không ghi được tác vụ, SMTP bị treo, retry và bỏ qua vé bị hủy.

Kiểm tra khóa/khôi phục trên PostgreSQL bằng `TICKET_EMAIL_TEST_DATABASE_URL='postgresql://...' node --test apps/backend/scripts/smoke-ticket-email-queue.mjs`, dùng database local/disposable. Bài kiểm tra tạo schema riêng, chỉ áp dụng migration hàng đợi trong schema này, kiểm tra hai worker lấy tác vụ đồng thời rồi xóa schema kiểm thử.

## Go-live gate

- `GET /api/health/ready` trả HTTP 200 ở backend.
- Báo cáo `GET /api/scheduling/events/:eventId/conflicts` có `valid: true`.
- K6 đạt ngưỡng trong `tests/load/sea-games.js` với tải mục tiêu.
- Restore PITR đã được diễn tập thành công.
- Tài khoản được cấp theo least privilege; không dùng chung tài khoản.
- Kết quả thử đi đủ chuỗi ENTERED → REFEREE_CONFIRMED → APPROVED → PUBLISHED → LOCKED.
- Không còn lỗ hổng production mức critical/high trong báo cáo dependency scan hoặc đã có biện pháp giảm thiểu được phê duyệt.

## Rollback ứng dụng

Gắn mỗi bản build bằng `IMAGE_TAG`. Khi cần rollback, đổi `IMAGE_TAG` về bản trước rồi chạy lại `up -d`. Không rollback database bằng cách xóa volume; dùng migration thuận/nghịch đã kiểm thử hoặc PITR.
