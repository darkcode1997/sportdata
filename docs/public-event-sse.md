# Cập nhật trang sự kiện công khai qua SSE

Trang `/events/[eventId]` tải lịch lần đầu bằng REST, sau đó nghe
`GET /api/matches/event/:eventId/stream`. Bảng điểm CMS, trang hạng mục và các
màn hình khác giữ nguyên cơ chế hiện tại.

Stream gửi `ready`, `schedule-changed` và `heartbeat` mỗi 15 giây. Payload chỉ
chứa `eventId`; frontend tải lại tổng quan và các trang lịch đã mở khi nhận
thông báo. Các thay đổi trong cùng một giây được gộp lại. Khi mất SSE, trang
dùng polling 30 giây; khi kết nối lại sẽ tải dữ liệu mới nhất. Tab bị ẩn đóng
stream, mở lại khi người dùng quay về.

Mỗi lần đồng bộ từ SSE thêm `_scheduleSync` vào URL REST để tránh dùng response
HTTP/CDN đã cache trước thay đổi; khóa cache SWR và bộ lọc vẫn giữ nguyên.

NestJS phát thông báo trong bộ nhớ sau khi API thêm/sửa/xóa trận, tạo/thu hồi
nhánh đấu, chia ngày, xếp lịch hoặc xử lý kết quả thành công. API chấm điểm chỉ
phát khi bắt đầu/kết thúc trận; các lệnh điểm/đồng hồ và heartbeat giữ quyền
điều khiển không gây tải lại trang công khai. API REST hiện tại vẫn quyết định
kết quả nào được phép công bố. Lỗi API/transaction rollback không phát thông báo.

Không có migration, trigger, bảng mới, kết nối LISTEN hay thay đổi schema.
Kênh trong bộ nhớ phục vụ một backend instance, phù hợp cấu hình hiện tại.
Khi triển khai nhiều backend instance cần bổ sung một broker chung; thay đổi
database trực tiếp ngoài API không phát SSE. Sửa thông tin VĐV/hạng mục được
đồng bộ khi focus lại trang hoặc tải lại.

## Triển khai

Khởi động lại backend/frontend và reload Nginx với cấu hình mới. Route stream
có buffering/cache/gzip tắt và timeout dài; backend loại route này khỏi nén
và cache của API công khai. Không cần chạy migration cho SSE.

## Kiểm tra

```bash
npm run build:backend
node apps/backend/scripts/smoke-public-event-stream.mjs
npm run build:frontend
npm run lint --workspace=@sportdata/frontend
```

Smoke test chạy 100 kết nối HTTP SSE, kiểm tra gộp thông báo, API thành công/lỗi,
phân biệt sự kiện, bỏ qua heartbeat/chấm điểm/dry-run, đồng bộ khi kết nối lại,
headers và dọn tài nguyên. Test dùng dữ liệu giả trong bộ nhớ, không truy cập
database.

Trong DevTools Network của trang sự kiện: khi stream ổn định, không còn GET lịch
mỗi 5 giây; sửa lịch/bắt đầu trận/công bố kết quả sẽ cập nhật màn hình. Thử mất
kết nối, quay lại tab, đổi bộ lọc và tải nhiều trang để kiểm tra đồng bộ.

SSE loại bỏ request đọc định kỳ khi không có thay đổi. Mỗi lần thay đổi vẫn tải
lại dữ liệu REST, nên cần đo thêm với tải khán giả thực tế và tần suất cập nhật
của giải đấu trước khi xác định năng lực production.
