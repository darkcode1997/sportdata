# SEA Games operational readiness

## Kết luận

SportData hiện phù hợp làm **lõi điều hành thi đấu** (competition management core),
nhưng chưa nên được coi là hệ thống duy nhất để vận hành toàn bộ một kỳ SEA Games.
Quyết định go-live phải dựa trên cổng kiểm tra tại `CMS > Điều hành`, diễn tập thực địa
và xác nhận của từng trưởng bộ môn/địa điểm; không dựa riêng vào việc ứng dụng build thành công.

## Những năng lực lõi đã có

- Mô hình Event, Sport, Category, Athlete, Team/Entry, Draw, Match và kết quả.
- Venue → FOP → Session → Time Slot, khóa lịch thủ công và kiểm tra xung đột.
- Thể thức loại trực tiếp, vòng tròn, heat/lane và relay ở tầng dữ liệu/nghiệp vụ.
- Điều kiện VĐV theo tuổi tại ngày khai mạc, giới tính, cân nặng, môn/hạng mục và quota quốc gia.
- Quy trình kết quả: nhập → trọng tài xác nhận → phê duyệt → công bố → khóa;
  có phiên bản kết quả, lịch sử sửa và audit log.
- Vai trò nghiệp vụ, API phân trang/lọc, nén response, cache public và index lịch.
- PostgreSQL exclusion constraint để chặn hai lịch trùng trên cùng FOP/time slot.
- Cấu hình production mẫu gồm TLS reverse proxy, nhiều instance, replica/PITR,
  metrics, dashboard, cảnh báo và kịch bản kiểm thử tải.

## Cổng kiểm tra trước khi chốt lịch

Endpoint: `GET /api/scheduling/events/:eventId/readiness`

Cổng kiểm tra trả điểm, lỗi bắt buộc và cảnh báo cho các nhóm sau:

1. Sự kiện đã công bố; có môn, hạng mục và entry hợp lệ.
2. Entry đã được xác minh, đủ coverage theo hạng mục.
3. Venue/FOP đã gắn đúng quan hệ.
4. Session/Time Slot đã tạo và công bố.
5. Mỗi môn có quy tắc thời lượng, turnaround, thời gian nghỉ và cửa sổ thi đấu.
6. Trận đã sinh, vòng đầu có đủ người, lịch có giờ bắt đầu/kết thúc/FOP.
7. Trận đã liên kết Time Slot và không có xung đột cứng.
8. Trận kết thúc không bị bỏ quên ở bản nháp kết quả.
9. Có tài khoản riêng cho các vai trò vận hành.

Không được khóa lịch hoặc mở vận hành chính thức khi còn mục `FAIL`.

## Điều kiện bắt buộc trước test event

- Khai báo toàn bộ venue, FOP, session và time slot thật; không dùng tên/số sân mô phỏng.
- Chốt rule riêng cho từng môn cùng trưởng bộ môn và technical delegate.
- Tạo tài khoản cá nhân theo vai trò; không dùng chung tài khoản admin.
- Nhập entry chính thức, chạy eligibility/quota và xử lý hết entry chưa xác minh.
- Chạy auto-schedule, xử lý hết hard conflict, khóa các trận đã được duyệt.
- Diễn tập đầy đủ một ngày: check-in → gọi trận → nhập điểm → xác nhận → công bố → sửa sai.
- Diễn tập mất mạng tại venue, hỏng thiết bị, đổi sân, hoãn trận và khôi phục database.
- Chạy tải với số client thực tế và lưu báo cáo p95/error rate.
- Kiểm thử restore PITR trên một máy/cluster tách biệt; backup chưa restore thử không được coi là backup đạt.

## Khoảng trống cần làm trước kỳ đại hội thật

### P0 — an toàn và phân quyền

- Phân quyền theo phạm vi event/sport/venue, không chỉ theo role toàn hệ thống.
- SSO/MFA, vòng đời tài khoản theo ca làm việc và quy trình thu hồi quyền khẩn cấp.
- Token phiên đăng nhập bằng cookie `HttpOnly/Secure` hoặc BFF; tránh lưu bearer token dài hạn trong local storage.
- Rate limit/session/cache dùng kho chia sẻ (ví dụ Redis) khi chạy nhiều backend instance.
- Bộ test tự động cho eligibility, bracket progression, conflict, result workflow và phân quyền.

### P0 — vận hành tại địa điểm

- Đồng bộ thời gian chuẩn cho thiết bị, realtime push cho lịch/kết quả và màn hình call room.
- Chế độ offline có hàng đợi, idempotency key và quy trình reconcile khi mạng trở lại.
- Gán trọng tài/official/crew theo session và cảnh báo trùng người.
- Incident command: log sự cố, mức độ, người phụ trách, timeline xử lý và escalation.
- HA thực: failover PostgreSQL có điều phối, backup off-site/immutable và alert receiver đang hoạt động.

### P1 — phạm vi Games Management System

Các phân hệ sau hiện không nên ngầm coi là đã được SportData bao phủ:

- Accreditation/badge và kiểm soát ra vào.
- Medical, injury, emergency response và anti-doping/chain of custody.
- Workforce/volunteer, transport, accommodation và arrivals/departures.
- Broadcast booking, protocol/medal ceremony, ticketing và distribution feed cho đối tác.
- Kho tài liệu kỹ thuật, phê duyệt version và tích hợp federation/international federation.

Các miền này cần được xây riêng hoặc tích hợp với hệ thống chuyên dụng qua API/event bus.

## Định nghĩa “đủ vận hành”

Một sự kiện chỉ chuyển sang trạng thái sẵn sàng khi đồng thời:

- readiness không còn `FAIL` và mọi `WARN` có người chấp nhận rủi ro;
- toàn bộ test nghiệp vụ, bảo mật, tải, failover và restore đều có biên bản đạt;
- ít nhất một test event end-to-end tại từng loại venue đã hoàn thành;
- runbook, danh bạ escalation và quyền trực ca được phê duyệt;
- có phương án thủ công dự phòng cho lịch, gọi trận và kết quả khi hệ thống gián đoạn.

