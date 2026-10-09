# Tài khoản cá nhân, hồ sơ VĐV và vai trò sự kiện

SportData sử dụng một tài khoản cá nhân đăng nhập chung. Loại tài khoản chính không thay thế hồ sơ thi đấu hoặc nhiệm vụ được ban tổ chức duyệt tại từng sự kiện.

| Loại tài khoản | Khi đăng ký | Luồng sử dụng |
| --- | --- | --- |
| Tài khoản thường | Mặc định; không tạo VĐV | Theo dõi sự kiện, nhận tin, quản lý thông tin cá nhân |
| Vận động viên | Chủ động chọn; bắt buộc ngày sinh, giới tính, quốc gia | Hồ sơ VĐV, giấy tờ, đăng ký thi đấu và vé |
| Trọng tài | Hồ sơ chuyên môn chờ xác minh | Gửi hồ sơ nhận nhiệm vụ trọng tài theo sự kiện |
| Trưởng đoàn | Chọn đơn vị; chờ xác minh quyền đại diện | Hồ sơ nhiệm vụ trưởng đoàn; sau xác minh có thể gửi danh sách đoàn thuộc đơn vị |
| Huấn luyện viên | Hồ sơ chuyên môn chờ xác minh | Đăng ký nhiệm vụ HLV theo sự kiện |
| Nhân viên y tế | Hồ sơ chuyên môn chờ xác minh | Đăng ký nhiệm vụ y tế theo sự kiện |

Tài khoản đại diện đơn vị (`FEDERATION`) vẫn có luồng đăng ký riêng. Nhân viên vận hành SportData dùng tài khoản CMS riêng; các loại tài khoản cá nhân không được tự cấp quyền CMS hoặc quyền chấm điểm/vận hành trận đấu.

## Người dùng

Form `/account/register` chọn loại tài khoản, mặc định **Tài khoản thường**. Các tài khoản thường/chuyên môn không tự sinh hồ sơ VĐV. Đăng nhập cá nhân nhận diện tất cả loại tài khoản qua cùng email/mật khẩu.

`/account` hiển thị hồ sơ phù hợp. Người dùng có thể đổi loại tài khoản chính, bổ sung chuyên môn và đơn vị. Đổi loại chuyên môn hoặc thay thông tin chuyên môn/đơn vị sẽ đưa hồ sơ về chờ xác minh. Trưởng đoàn cần đơn vị và điện thoại trước khi được xác minh quyền đại diện; khai tên đơn vị không tự cấp quyền gửi đoàn.

Người đã có tài khoản có thể bấm **Đăng ký hồ sơ vận động viên**, nhập các thông tin thi đấu và xác nhận. Hồ sơ này là thao tác riêng, không yêu cầu tạo tài khoản mới. Người có loại chính HLV/trọng tài/y tế có thể giữ thêm hồ sơ VĐV đã xác nhận; truy cập `/account/athlete` để quản lý. Tại sự kiện, chọn đăng ký thi đấu bằng hồ sơ VĐV hoặc đăng ký nhiệm vụ chuyên môn.

`/events/:id/staff` nhận hồ sơ trọng tài, HLV, y tế và trưởng đoàn. Vai trò tại sự kiện có thể khác loại tài khoản chính. Mỗi người có tối đa một hồ sơ nhân sự đang chờ/được duyệt cho mỗi sự kiện; hồ sơ đã từ chối/hủy có thể gửi lại. Có thể đăng ký vai trò khác ở sự kiện khác. Chức năng này chưa quản lý nhiều nhiệm vụ đồng thời trong cùng một sự kiện.

Đăng ký nhân sự không tạo VĐV, không cấp tài khoản CMS và không phát hành vé thi đấu. Người dùng xem trạng thái/ý kiến ban tổ chức trong tài khoản hoặc trang nhiệm vụ và có thể hủy hồ sơ của chính mình. Hồ sơ VĐV, ảnh, giấy tờ và vé thi đấu tiếp tục dùng luồng hiện có.

## Ban tổ chức

**Hệ thống & tài khoản → Người dùng SportData** lọc từng loại tài khoản, xem thông tin chuyên môn và xác minh/từ chối. Việc xác minh lưu người duyệt, thời điểm và ý kiến; từ chối phải có lý do. Kiểm tra version hồ sơ trước khi lưu tránh duyệt trên thông tin đã thay đổi. Chứng chỉ và quyền đại diện cần được kiểm tra thực tế; trường giới thiệu là khai báo của người dùng.

Trong **Sự kiện → Đăng ký**, admin và Games Admin có bảng **Nhân sự chuyên môn và trưởng đoàn** để xem hồ sơ, phân công, duyệt, từ chối hoặc thu hồi. Khi phê duyệt, người vận hành phải xác nhận đã kiểm tra chuyên môn/chứng chỉ hoặc quyền đại diện phù hợp với nhiệm vụ. Quyết định nhiệm vụ được ghi theo sự kiện, có người duyệt và ý kiến. Nhận hồ sơ dùng khóa theo tài khoản để tránh hồ sơ trùng khi gửi đồng thời; cập nhật trạng thái kiểm tra trạng thái trước đó để tránh ghi đè việc hủy/duyệt của người khác.

Trưởng đoàn chỉ gửi danh sách đoàn khi tài khoản đang hoạt động, có đơn vị và được xác minh. Backend áp dụng quốc gia/đơn vị từ quyền đại diện đã xác minh và kiểm tra đơn vị thuộc danh sách được tham dự. Duyệt nhiệm vụ trưởng đoàn cho một sự kiện không tự cấp quyền đại diện đơn vị.

## Tài khoản và dữ liệu cũ

Hai migration mới thêm loại tài khoản và bảng nhiệm vụ; không xóa tài khoản, hồ sơ hay lịch sử thi đấu. Tài khoản cũ giữ loại hiện tại để tránh đoán người nào thực sự là VĐV. Tài khoản cũ tạo nhầm có thể chuyển về **Tài khoản thường** trong trang cá nhân hoặc CMS.

Hồ sơ VĐV cũ được đánh dấu chưa xác nhận chủ động nếu được tạo kèm tài khoản. Khi đổi sang loại khác, hồ sơ chưa có đăng ký, nội dung/hạng đấu, sự kiện, thành tích hoặc lịch sử thi đấu được ẩn khỏi danh sách VĐV, không xóa. Hồ sơ đã sử dụng được giữ lại. Khi người dùng chủ động tạo/xác nhận hồ sơ VĐV, hồ sơ được mở lại và được đánh dấu đã xác nhận. Hồ sơ do CMS tạo giữ trạng thái đã xác nhận.

Không dùng email trùng để tự liên kết hồ sơ VĐV trong một request đọc trang cá nhân nữa. Liên kết tài khoản/VĐV dùng ID rõ ràng từ đăng ký chủ động.

## Triển khai và kiểm tra

Chạy `npm run prisma:generate` và áp dụng `20261009100000_personal_account_types`, sau đó `20261009100100_personal_profiles_and_event_staff`. Hai migration tách bước thêm enum và dùng enum để phù hợp PostgreSQL. Docker/Vercel áp dụng qua quy trình migration production hiện có.

Kiểm tra bằng build backend/frontend, frontend lint và `ACCOUNT_ROLES_TEST_DATABASE_URL=postgresql://... node --test apps/backend/scripts/smoke-account-roles.cjs` sau khi build. Script chỉ cho phép PostgreSQL localhost, tạo schema riêng, chạy toàn bộ migration và API thật, rồi dọn schema. Bao phủ sáu loại tài khoản, mặc định thường, chủ động tạo VĐV, nhiều vai trò, hồ sơ cũ, xác minh, trùng request, quyền CMS, quyền đại diện và trạng thái nhiệm vụ. Không gửi email thật.
