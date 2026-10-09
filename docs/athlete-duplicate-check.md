# Kiểm tra hồ sơ VĐV trùng

Trước khi chạy phiên bản có kiểm tra CCCD, áp dụng migration bằng `npm run prisma:deploy`, rồi kiểm tra với `npm run prisma:status`. Các lệnh migration đọc `.env` ở thư mục gốc giống backend. Hai migration `20261008010000_athlete_identity` và `20261008020000_athlete_identity_numbers` tạo bảng `AthleteIdentity` và các cột hash/số giấy tờ mã hóa; thiếu chúng sẽ làm API trả lỗi database thay vì kết quả kiểm tra trùng.

Đăng ký công khai yêu cầu số CCCD (12 chữ số) hoặc passport (5–20 ký tự chữ/số), kể cả khi OCR tắt. Trang `/events/[eventId]/register` chỉ kiểm tra trùng khi người dùng bấm gửi hồ sơ: gọi `POST /participant-auth/identity/check` trước khi tải ảnh lên và hiển thị lỗi API nếu giấy tờ đã được sử dụng. Backend kiểm tra lại trong transaction trước khi tạo hồ sơ. Toàn bộ danh sách đăng ký được rollback nếu một VĐV bị trùng. Nhập hoặc sửa số giấy tờ không gọi API tra cứu, không tự điền hồ sơ và không khóa nút gửi.

Sau khi đủ thông tin VĐV và nội dung thi đấu, bước kiểm tra trùng chạy trước bước yêu cầu đủ ảnh: CCCD đã có sẽ báo trùng cả khi chưa chọn ảnh. Lỗi gửi hồ sơ được giữ trong khung đỏ cạnh nút gửi; không chỉ xuất hiện dưới dạng thông báo tự tắt. Sửa thông tin VĐV hoặc gửi lại sẽ xóa lỗi trước đó.

API `POST /participant-auth/identity/lookup` vẫn hỗ trợ dùng lại hồ sơ, nhưng trang đăng ký công khai không sử dụng API này. Với client dùng API này, người dùng đối chiếu SĐT từng dùng (bao gồm SĐT người đại diện trong đăng ký cũ), hoặc họ tên và ngày sinh. Trước khi khớp, API chỉ trả hướng dẫn xác nhận; không trả họ tên, ngày sinh hay mã vé. Hồ sơ chỉ được dùng lại sau khi khớp và được người dùng xác nhận.

Token xác nhận có thời hạn 30 phút, ràng buộc hồ sơ, số giấy tờ, sự kiện và SĐT dùng để đối chiếu. Backend xác minh token trước khi dùng lại hồ sơ. Người dùng không thể truyền athleteId bất kỳ để lấy hồ sơ của người khác. Dữ liệu cá nhân của hồ sơ cũ không bị ghi đè bởi form đăng ký.

Đã đăng ký cùng sự kiện: mở trạng thái/thanh toán/vé hiện có. Chưa đăng ký: tạo đăng ký mới bằng cùng athleteId; giữ ảnh và giấy tờ cũ, chỉ bổ sung tệp còn thiếu. Transaction khóa dùng chung đảm bảo gửi lại hoặc gửi đồng thời vẫn chỉ có một hồ sơ và một đăng ký. Không tạo submission rỗng khi toàn bộ đăng ký đã có.

Thanh toán thành công và giấy tờ đã xác thực: tự xác nhận đăng ký, đồng bộ nội dung thi đấu và phát hành vé. Giấy tờ chưa xác thực hoặc đăng ký bị từ chối/hủy không được tự chuyển sang xác nhận. Callback thanh toán lặp lại không tạo lịch sử trạng thái hoặc vé mới.

Quy tắc:
- CCCD giống nhau sau khi bỏ khoảng trắng, dấu chấm, dấu gạch ngang: chặn.
- Passport giống nhau trong cùng quốc gia: chặn.
- Cùng họ tên (không phân biệt hoa thường, chuẩn hóa Unicode và khoảng trắng), ngày sinh, giới tính, quốc gia và địa chỉ hoặc SĐT: chặn.
- Hồ sơ cũ không có số giấy tờ, địa chỉ hoặc SĐT: đối chiếu họ tên, ngày sinh, giới tính, quốc gia và đơn vị. Ban tổ chức kiểm tra thủ công khi hai người có cùng những thông tin này.
- SĐT giống nhau nhưng VĐV khác nhau: cho phép; hỗ trợ dùng chung số của người đại diện.

Áp dụng cho đăng ký khách/đơn vị/đăng ký hộ, tạo tài khoản VĐV, tạo/sửa VĐV trong CMS và xác nhận OCR. Kiểm tra hồ sơ trùng không thay thế quy tắc đăng ký hạng đấu của sự kiện. Hồ sơ cũ chỉ được dùng lại trong đăng ký công khai sau bước đối chiếu và xác nhận.

Bảng `AthleteIdentity` lưu hash để đối chiếu và số CCCD/passport mã hóa bằng AES-256-GCM để hiển thị trong CMS. Dùng `SETTINGS_ENCRYPTION_KEY` (hoặc JWT_SECRET hợp lệ khi chưa có khóa riêng), giữ nguyên khóa khi khôi phục database. Hai loại số giấy tờ được giữ riêng để bổ sung passport không làm mất kiểm tra CCCD. API `/athletes/:id/identity-details` chỉ cho phép các vai trò CMS được xem giấy tờ và trả `private, no-store`; API hồ sơ công khai không trả số hoặc ciphertext.

Hồ sơ cũ lấy số từ dữ liệu OCR nếu có. Hash đã lưu trước đó không thể chuyển ngược thành số; hồ sơ không có số/OCR vẫn hiển thị ảnh giấy tờ, cần nhập lại số qua API quản trị hoặc xác nhận OCR để hiển thị số. Dữ liệu OCR cũ được đối chiếu khi kiểm tra. Advisory lock dùng chung cho các đường tạo hồ sơ để chặn hai yêu cầu đồng thời. Migration không gộp hoặc xóa hồ sơ cũ; cần rà soát hạng đấu, trận đấu và vé trước khi xử lý các bản trùng đã tồn tại.

Trang đăng ký công khai không có trường địa chỉ theo giấy tờ, chiều cao hoặc cân nặng. Backend và CMS vẫn hỗ trợ các thông tin này; chiều cao và cân nặng không bắt buộc. Hồ sơ chỉ hiển thị hai thông số khi đã nhập. Nếu có cân nặng, hệ thống vẫn kiểm tra giới hạn hạng đấu; bỏ trống cân nặng không chặn đăng ký.

Kiểm tra database và API cục bộ:
`npm run build:backend` rồi `node tests/integration/athlete-identity-live.mjs` khi backend đang chạy trên cổng 4000. Bài kiểm tra dùng PostgreSQL local thật, xác minh CCCD mới/sai định dạng/trùng (kể cả khoảng trắng), và xóa duy nhất hồ sơ giả do nó tạo.

Kiểm tra bổ sung với môi trường Docker tương ứng:
`Get-Content -Raw tests/integration/athlete-identity-database.cjs | docker compose exec -T backend node`
