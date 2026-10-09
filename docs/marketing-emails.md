# Người dùng SportData và email giới thiệu

Trong **Hệ thống & tài khoản → Người dùng SportData**, admin có thể tìm kiếm tài khoản cá nhân/đơn vị, lọc quyền nhận tin, khóa/kích hoạt tài khoản và quản lý chiến dịch email. Quyền quản trị CMS vẫn nằm ở **Tài khoản CMS**.

## Quyền nhận tin

Người dùng chọn nhận email ở form đăng ký hoặc **Tài khoản → Quản lý email sự kiện và tin tức** (`/account/email-preferences`). Có hai chủ đề: sự kiện và bài viết. Các tài khoản hiện có được giữ ở trạng thái **không nhận tin**; migration không tự đăng ký thay người dùng. CMS hiển thị thời điểm đồng ý/hủy nhận tin và không cho admin bật thay người dùng.

Email có liên kết hủy đăng ký không cần đăng nhập, trang xác nhận để tránh trình quét email tự hủy, và header `List-Unsubscribe`/`List-Unsubscribe-Post` hỗ trợ one-click POST của nhà cung cấp email. Khi người dùng đăng ký lại, token hủy cũ bị vô hiệu hóa. Email vé, giao dịch và đặt lại mật khẩu không phụ thuộc lựa chọn marketing.

## Xuất bản và hàng đợi

Khi tạo nội dung đã công khai hoặc chuyển bản nháp sang công khai lần đầu, việc lưu nội dung và tạo chiến dịch/hàng đợi nằm trong cùng transaction. Sửa nội dung hoặc xuất bản lại không tạo chiến dịch trùng. Nội dung đã công khai trước migration không được gửi hồi tố. Người nhận được chốt lúc xuất bản: tài khoản đang hoạt động, đã xác minh và đã đăng ký đúng chủ đề. Đăng ký nhận tin sau đó không tự gửi lại các chiến dịch cũ.

Worker kiểm tra lại quyền nhận tin, thời điểm đồng ý, tình trạng tài khoản và nội dung trước khi gửi. Nội dung bị gỡ công khai/xóa hoặc người nhận không còn đủ điều kiện được đánh dấu **Bỏ qua**. Bài viết có `publishedAt` tương lai chờ đến thời điểm đó. Nếu slug bài viết thay đổi, link email dùng slug hiện tại. Phần tiêu đề/tóm tắt email là bản chụp khi xuất bản; CMS có nút **Xem email** để kiểm tra.

Hàng đợi PostgreSQL dùng `FOR UPDATE SKIP LOCKED`, lease 5 phút và token riêng cho mỗi lần nhận việc. Email lỗi được thử lại tối đa 5 lần với khoảng chờ tăng dần (1, 2, 4, 8 phút); lỗi cuối cùng xuất hiện trong chi tiết chiến dịch. Admin có thể thử lại các email **Thất bại**, tạm dừng từng chiến dịch hoặc toàn bộ email marketing. Email đang gửi có thể hoàn tất khi bấm tạm dừng. Email đang chờ được giữ lại và tiếp tục khi bật lại. **Xử lý email đang chờ** xử lý tối đa 10 email/lần, có ngân sách thời gian 40 giây trước khi nhận email tiếp theo.

Mỗi worker giãn 1 giây giữa các email; nhiều instance có thể gửi đồng thời. Đặt giới hạn SMTP phù hợp với lượng người nhận. `Đã gửi` nghĩa là SMTP đã chấp nhận email, không chứng minh người nhận đã mở hoặc hộp thư đã giao thành công. Không có tracking pixel. SMTP và database không hỗ trợ transaction chung: nếu process dừng sau khi SMTP nhận email nhưng trước khi lưu trạng thái, retry có thể gửi lại email đó. Message-ID ổn định giúp nhận diện, không bảo đảm khử trùng tại nhà cung cấp.

## Triển khai

1. Chạy migration `20261008120000_marketing_emails` bằng quy trình production hiện có (`prisma migrate deploy`); chạy `npm run prisma:generate` khi phát triển local.
2. Cấu hình SMTP trong **Cài đặt hệ thống** hoặc ENV (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Marketing có công tắc riêng, không dùng công tắc email vé.
3. Đặt `FRONTEND_URL` là URL HTTPS của website production. `BACKEND_PUBLIC_URL` là origin HTTPS của API nếu cần header hủy one-click trỏ thẳng API; nếu bỏ trống, dùng rewrite `/api` của frontend.
4. Đặt `CRON_SECRET` ngẫu nhiên trên project backend Vercel. Không đưa giá trị secret vào repo. Có thể đặt `MARKETING_EMAIL_ENABLED=false` để tạm dừng ban đầu; lựa chọn đã lưu trong CMS được ưu tiên.

Backend chạy lâu dài tự xử lý hàng đợi mỗi 15 giây. Vercel gắn đợt gửi đầu tiên với request xuất bản qua `waitUntil` (tối đa 100 email, ngân sách 180 giây trước email tiếp theo), và cron dự phòng `/api/marketing/cron` mỗi ngày lúc 00:00 UTC. Preview không gửi email marketing.

Vercel Hobby chỉ hỗ trợ cron hằng ngày. Với nhiều người nhận hoặc yêu cầu retry sớm, cấu hình scheduler bên ngoài gọi **GET** `https://<backend>/api/marketing/cron` mỗi phút với header `Authorization: Bearer <CRON_SECRET>`; hoặc dùng lịch cron thường xuyên hơn trên gói hỗ trợ. Không đặt secret trong URL. Mỗi lần gọi xử lý tối đa 100 email trong ngân sách 180 giây, email còn lại chờ lượt tiếp theo. Theo dõi lượng **Chờ gửi** trong CMS để điều chỉnh scheduler. `waitUntil` và cron vẫn chịu giới hạn thời gian của Vercel Function.

Tài liệu Vercel: [waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package), [giới hạn cron](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Kiểm tra

Chạy `npm run build` và `npm run lint --workspace=@sportdata/frontend`. Sau khi build, chạy `node --test apps/backend/scripts/smoke-marketing.cjs` để kiểm tra chọn người nhận, hủy nhận tin, retry, mẫu email và quyền API bằng dữ liệu giả lập, không kết nối SMTP/database production.

Kiểm tra PostgreSQL thật: đặt `MARKETING_TEST_DATABASE_URL` là URL PostgreSQL local/disposable rồi chạy `node --test apps/backend/scripts/smoke-marketing-postgres.cjs`. Script tạo schema riêng, áp dụng toàn bộ migration, kiểm tra xuất bản thật qua service, lọc người nhận, rollback, nhận việc đồng thời và phục hồi lease; xóa schema kiểm thử trong `finally`. Script từ chối database ngoài localhost.

Kiểm tra staging: đăng ký hai tài khoản với lựa chọn nhận tin khác nhau; xuất bản một sự kiện và một bài viết; xác nhận chỉ tài khoản/chủ đề phù hợp có email. Sửa/xuất bản lại không tạo chiến dịch khác. Thử hủy nhận tin trước khi gửi, khóa tài khoản, gỡ công khai nội dung, tạm dừng/bật lại, lỗi SMTP và retry. Kiểm tra GET link hủy chỉ hiển thị xác nhận; POST từ nhà cung cấp email hủy trực tiếp. Đặt domain gửi SMTP với SPF/DKIM/DMARC theo hướng dẫn của nhà cung cấp email.
