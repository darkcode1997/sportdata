# Định hướng sản phẩm SportData

## Tầm nhìn

SportData hướng tới trở thành nền tảng tổ chức sự kiện thể thao đa môn dành cho Việt Nam và có khả năng mở rộng quốc tế. Hệ thống kết nối công ty tổ chức sự kiện, liên đoàn, trung tâm, câu lạc bộ, quốc gia, vận động viên và người theo dõi trong một nguồn dữ liệu thống nhất.

## Phase 1 — Nền tảng Việt hóa

Mục tiêu của Phase 1 là hoàn thiện một sản phẩm tiếng Việt có thể dùng để giới thiệu, thiết lập và vận hành sự kiện thực tế:

- Danh mục công khai cho sự kiện, bộ môn, quốc gia và đơn vị thể thao.
- Sự kiện một môn hoặc đa môn, nhiều cấp độ từ nội bộ đến quốc tế.
- Quản lý vận động viên, đội, hạng mục và lượt đăng ký.
- Xếp lịch theo địa điểm, phiên thi đấu, sân/sàn và khung giờ.
- Nhập, xác nhận, phê duyệt, công bố và khóa kết quả.
- Bảng xếp hạng, thống kê và trang dữ liệu công khai.
- CMS tiếng Việt với phân quyền theo vai trò vận hành.
- Tin tức, banner và kênh tiếp nhận yêu cầu tổ chức sự kiện.
- Tài khoản cá nhân cho vận động viên, hồ sơ định danh và vé tham dự.
- Ju-Jitsu là bộ môn chuẩn đầu tiên: kiểm tra tuổi, giới tính, hạng cân và đăng ký cá nhân.

## Miền nghiệp vụ cốt lõi

1. **Danh mục nền tảng:** quốc gia, bộ môn, hạng mục, liên đoàn và đơn vị thể thao.
2. **Quản lý sự kiện:** thông tin giải, đơn vị tổ chức, đơn vị tham gia, địa điểm và bộ môn.
3. **Đăng ký thi đấu:** vận động viên, đội, lượt đăng ký, xác minh và rút lui.
4. **Điều hành thi đấu:** sơ đồ, bảng đấu, heat/làn, lịch, sân/sàn và trạng thái trận.
5. **Quản trị kết quả:** nhập liệu, xác nhận trọng tài, phê duyệt, công bố và lịch sử thay đổi.
6. **Công bố dữ liệu:** lịch sự kiện, kết quả, bảng xếp hạng, tin tức và dữ liệu cho khán giả.

## Nguyên tắc kiến trúc

- Sự kiện là trung tâm; vận động viên, đội, đơn vị và kết quả được đặt trong ngữ cảnh sự kiện.
- Một sự kiện có thể gồm nhiều bộ môn và nhiều đơn vị/quốc gia tham gia.
- `Federation` được hiểu rộng là đơn vị thể thao: liên đoàn, trung tâm, câu lạc bộ, trường hoặc học viện.
- Dữ liệu vận hành có trạng thái và luồng phê duyệt rõ ràng trước khi công bố.
- Website công khai chỉ đọc dữ liệu đã xuất bản; CMS chịu trách nhiệm tạo và kiểm soát dữ liệu.
- Nội dung giao diện sử dụng tiếng Việt làm mặc định, nhưng mô hình dữ liệu không khóa khả năng quốc tế hóa.

## Các phase tiếp theo

### Phase 2 — Dịch vụ và thương mại sự kiện

- Mở rộng cổng đăng ký từ cá nhân sang đội và đơn vị.
- Danh sách chờ nâng cao, hóa đơn và tích hợp thanh toán trực tuyến.
- Tài liệu, điều lệ, biểu mẫu và thông báo.
- Quản lý tình nguyện viên, báo chí và tác nghiệp.

### Phase 3 — Trải nghiệm trực tiếp

- Live scoring, bảng điểm công khai và màn hình sân đấu.
- Livestream, đồ họa truyền hình và API dữ liệu thời gian thực.
- Accreditation, thẻ ra vào và phân vùng quyền truy cập.
- Ứng dụng di động và thông báo theo sự kiện.

### Phase 4 — Nền tảng quốc tế

- Đa ngôn ngữ, múi giờ và tiền tệ.
- White-label cho liên đoàn và quốc gia.
- Ranking liên giải, tiêu chuẩn trao đổi dữ liệu và tích hợp đối tác.
- Hạ tầng đa tenant và phân vùng dữ liệu theo tổ chức.
