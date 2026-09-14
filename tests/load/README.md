# Kiểm thử tải SEA Games

Chạy sau khi cài [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/):

```bash
k6 run -e BASE_URL=https://sport.example.org -e EVENT_ID=<event-id> tests/load/sea-games.js
```

Kịch bản tăng dần đến 200 người dùng ảo, đọc danh sách sự kiện, môn, lịch theo cursor và tóm tắt lịch. Ngưỡng mặc định: lỗi dưới 1%, p95 dưới 1 giây, p99 dưới 2 giây. Tăng số VU theo mục tiêu tải đã thống nhất trước go-live.
