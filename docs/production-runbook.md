# SportData production runbook

## Điều kiện trước khi chạy

- Domain đã trỏ về máy chủ và hai file TLS nằm tại `deploy/certs/fullchain.pem`, `deploy/certs/privkey.pem`.
- Sao chép `.env.production.example` thành `.env.production` và thay toàn bộ giá trị `replace-with-*`.
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

## PostgreSQL và PITR

Primary bật WAL archive, replica nhận streaming replication và `postgres-base-backup` tạo base backup hằng ngày. Trước go-live phải diễn tập restore sang một máy chủ riêng:

1. Dừng ghi ứng dụng hoặc chọn recovery timestamp.
2. Khôi phục base backup gần nhất.
3. Cấu hình `restore_command` đọc WAL từ volume/object storage.
4. Đặt `recovery_target_time`, tạo `recovery.signal` và khởi động PostgreSQL.
5. Chạy kiểm tra số lượng Event, Entry, Match, ResultRevision và AuditLog.

Volume cùng một máy chủ không phải bản backup thảm họa. Đồng bộ base backup và WAL sang object storage có versioning/immutability hoặc dùng PostgreSQL managed có HA/PITR.

## Go-live gate

- `GET /api/health/ready` trả HTTP 200 ở cả hai backend.
- Báo cáo `GET /api/scheduling/events/:eventId/conflicts` có `valid: true`.
- K6 đạt ngưỡng trong `tests/load/sea-games.js` với tải mục tiêu.
- Restore PITR đã được diễn tập thành công.
- Tài khoản được cấp theo least privilege; không dùng chung tài khoản.
- Kết quả thử đi đủ chuỗi ENTERED → REFEREE_CONFIRMED → APPROVED → PUBLISHED → LOCKED.
- Không còn lỗ hổng production mức critical/high trong báo cáo dependency scan hoặc đã có biện pháp giảm thiểu được phê duyệt.

## Rollback ứng dụng

Gắn mỗi bản build bằng `IMAGE_TAG`. Khi cần rollback, đổi `IMAGE_TAG` về bản trước rồi chạy lại `up -d`. Không rollback database bằng cách xóa volume; dùng migration thuận/nghịch đã kiểm thử hoặc PITR.
