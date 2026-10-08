# Cấu hình tích hợp trong CMS

Admin quản lý SMTP, FPT.AI, MoMo và VNPAY tại `/cms/settings`. Giá trị trong bảng `IntegrationSetting` được ưu tiên hơn ENV. Xóa giá trị CMS để quay về ENV; thao tác này không xóa biến trên máy chủ. Giá trị mới áp dụng cho yêu cầu tiếp theo, bao gồm email đặt lại mật khẩu.

Triển khai migration bằng `npm run prisma:deploy` trước khi chạy phiên bản mới. Cấu hình `SETTINGS_ENCRYPTION_KEY` với ít nhất 32 ký tự ngẫu nhiên trên máy chủ; Docker Compose truyền khóa này vào backend. Khi không có khóa riêng, hệ thống dùng `JWT_SECRET` nếu đủ 32 ký tự và không chứa `change-me`. Không có khóa hợp lệ thì không thể lưu secret.

Secret được mã hóa bằng AES-256-GCM, gắn với tên biến, và không trả về qua API quản trị. Giữ khóa mã hóa ngoài database, bảo quản cùng bản sao lưu và dùng chung cho mọi backend instance. Đổi khóa sẽ khiến secret cũ không giải mã được; cần khôi phục khóa hoặc xóa và nhập lại secret. Nên dùng khóa riêng để việc đổi JWT không ảnh hưởng cấu hình.

URL tích hợp nhập trong CMS phải dùng HTTPS. Chỉ Admin được xem và sửa danh sách biến cho phép. DATABASE_URL, JWT_SECRET, cổng, URL ứng dụng và biến triển khai tiếp tục được quản lý trên máy chủ. Việc thêm tên biến ngoài danh sách chưa được hỗ trợ.

Thay khóa thanh toán có thể ảnh hưởng xác minh callback của giao dịch đang chờ. Hoàn tất các giao dịch này trước khi chuyển tài khoản hoặc khóa cổng thanh toán.
