# Pre-matches và Preview cây đấu

Áp dụng migration `20261003020000_draw_preconfiguration`, chạy `npm run prisma:generate`, rồi khởi động lại backend. Migration không tự cấp quyền cho bất kỳ tài khoản nào.

Admin cấp `DRAW_PRECONFIGURE` trong **Tài khoản CMS → Chỉnh sửa → Quyền riêng**. Quyền này độc lập với vai trò: kể cả Admin cũng cần được cấp để truy cập cấu hình, preview và lịch sử. Quyền sinh nhánh vẫn theo vai trò vận hành hiện có. JWT được kiểm tra bằng quyền hiện tại trong database mỗi request.

Trong workspace sự kiện, chọn hạng đấu rồi cấu hình Pre-matches phía trên phần chọn thể thức. Cả năm thể thức loại trực tiếp, tuyệt đối, loại kép, đấu vớt và vòng tròn đều hỗ trợ. Người có quyền riêng chọn hai CompetitionEntry và hệ thống tự lưu; xóa cặp cũng tự lưu. Mỗi lần lưu tăng revision và vô hiệu hóa preview trước đó. Cách xếp seed cũng được tự lưu tại đây. Khi có lỗi lưu, xử lý lỗi hoặc tải lại trước khi preview.

**Preview cây đấu** lưu phương án hoàn chỉnh trên server, gồm slot đầu vào, trận, miễn đấu và liên kết thắng/thua các vòng tiếp theo, nhưng không tạo bản ghi Draw, Match hoặc bảng vòng tròn. Đối với loại kép và đấu vớt, cặp đặt trước chỉ áp dụng vòng đầu nhánh chính; preview vẫn hiển thị đầy đủ nhánh phụ. SportdataBracket dùng chính graph này để hiển thị.

Vòng tròn cho phép chọn số bảng trong Pre-matches. Cặp đặt trước được xếp cùng bảng và gặp nhau ở lượt đầu; các lượt sau dùng vòng xoay để mỗi cặp VĐV trong bảng gặp nhau đúng một lần, mỗi VĐV thi đấu tối đa một trận mỗi lượt. Số bảng và danh sách thành viên được lưu cùng preview; khi sinh mới tạo RoundRobinGroup, thành viên và MatchParticipant. Đấu vớt dưới 6 VĐV dùng vòng tròn một bảng nhưng vẫn giữ cấu hình riêng REPECHAGE. Loại kép cần ít nhất 4 VĐV. Các cấu hình được lưu theo drawType; loại trực tiếp và tuyệt đối cùng sử dụng MAIN_TREE.

Khi người vận hành bất kỳ sinh nhánh, backend kiểm tra phiên bản đầu vào rồi dùng graph đã lưu, giữ nguyên ID trận, vị trí VĐV và liên kết tiến nhánh. Cách xếp seed, tên cây và các lựa chọn khác do người gọi gửi không thay thế phương án đã preview. Số trận được cấp nối tiếp tại thời điểm preview và giữ nguyên khi sinh; nếu một nhánh khác đã sử dụng dải số này, yêu cầu bị từ chối và cần preview lại.

Phiên bản bao gồm toàn bộ danh sách CompetitionEntry của hạng, trạng thái, seed, thông tin VĐV và đơn vị/quốc gia, liên kết đăng ký, điều kiện hạng, giới hạn tuổi sự kiện, ngày thi đấu, danh sách FOP, cặp và lựa chọn preview. Dữ liệu thay đổi làm sinh nhánh trả HTTP 409, yêu cầu người có quyền preview lại. Hạng chưa từng có cấu hình riêng vẫn sinh tự động theo luồng thông thường. Một cấu hình đã lưu, kể cả không có cặp, phải có preview hợp lệ.

Đầu vào phải gồm toàn bộ lượt đăng ký cá nhân VERIFIED, đúng sự kiện/hạng và đáp ứng giới tính, cân nặng, tuổi áp dụng. Không được dùng trùng VĐV. Với cây loại trực tiếp, kích thước cây B là lũy thừa hai nhỏ nhất chứa N VĐV. Để mọi trận vòng đầu có ít nhất một VĐV, số cặp cố định tối đa là `N − B/2`; ví dụ 5 VĐV có cây 8 vị trí, tối đa một cặp cố định và ba miễn đấu. Với vòng tròn, các bảng được chia đều và tối đa `floor(số VĐV của bảng / 2)` cặp đặt trước cho mỗi bảng. Cặp đặt trước ưu tiên hơn việc tách seed, CLB hoặc quốc gia.

Cấu hình và phương án không được đưa vào các API Draw/Match thông thường. Người không có quyền không thấy hoặc tải phần Pre-matches, Preview, lịch sử hoặc dấu hiệu cặp chỉ định. Lịch sử riêng ghi người thao tác, revision và snapshot khi cấu hình, preview hoặc sinh nhánh; không chỉnh sửa lịch sử qua API.

Mọi thao tác ghi được thực hiện trong transaction PostgreSQL Serializable, khóa event để phân bổ số trận và kiểm tra tồn tại trước khi ghi. Yêu cầu sinh đồng thời cho cùng phương án chỉ có một yêu cầu thành công; các yêu cầu còn lại trả 409. Cấu hình dùng revision để từ chối chỉnh sửa đè lên phiên bản của người khác.

## API riêng

Các đường dẫn dưới đây có tiền tố `/api/matches/event/:eventId/category/:categoryId` và yêu cầu JWT cùng `DRAW_PRECONFIGURE`:

- `GET /preconfiguration?drawType=MAIN_TREE|DOUBLE_ELIMINATION|REPECHAGE|ROUND_ROBIN_POOL`
- `PATCH /preconfiguration`: `{ drawType, pairs: [{ entry1Id, entry2Id }], seedingMode, groupCount?, revision }`
- `POST /preview-draw`: các trường của generate-draw cùng revision hiện tại.
- `GET /preconfiguration/history?drawType=MAIN_TREE|DOUBLE_ELIMINATION|REPECHAGE|ROUND_ROBIN_POOL`: tối đa 100 lần thay đổi mới nhất.

Revision ban đầu là 0. Sau mỗi thao tác, dùng revision từ response cho lần ghi kế tiếp. GET trả `stale` và chỉ trả preview khi phiên bản đầu vào còn khớp. Sinh nhánh qua API hiện có `/generate-draw`, không cần quyền riêng. Vòng tròn dùng `type: ROUND_ROBIN_POOL` và `groupCount`. Endpoint vòng tròn cũ trong competitions cũng phải dùng đúng phương án đã lưu nếu có cấu hình ROUND_ROBIN_POOL.

## Kiểm thử

```sh
npm run build
npm run lint --workspace=@sportdata/frontend
node apps/backend/scripts/smoke-bracket-byes.mjs
node apps/backend/scripts/smoke-draw-preconfiguration.mjs
```

Smoke test mới dùng database URL từ môi trường hoặc `.env`, chỉ cho phép PostgreSQL localhost. Script tạo schema tạm, áp dụng migration, chạy HTTP API thật với tài khoản tạm rồi xóa schema trong `finally`; không thay đổi tài khoản và dữ liệu ứng dụng hiện có. Bao phủ 2–65 VĐV ở năm cách xếp seed, A–C → preview → đổi tài khoản → sinh đúng cây, quyền API và thu hồi quyền, miễn đấu, version thay đổi, revision cũ, dữ liệu riêng, loại kép, đấu vớt 6/16 VĐV, đấu vớt dưới 6, vòng tròn nhiều bảng, tuyệt đối và bốn yêu cầu sinh đồng thời.

Kiểm tra giao diện bằng Playwright với frontend đang chạy (toàn bộ API được mock, không ghi dữ liệu):

```sh
node apps/frontend/scripts/smoke-draw-preconfiguration.mjs
```

Có thể đặt `DRAW_PLAYWRIGHT_MODULE` để trỏ đến Playwright cài sẵn, `DRAW_CHROME_PATH` cho executable Chrome, `DRAW_UI_URL` cho URL frontend và `DRAW_SCREENSHOT_PATH` để lưu ảnh chụp. Bài kiểm tra xác nhận chọn một VĐV chưa lưu, chọn đủ hai tự lưu đúng Entry ID, xóa cặp tự lưu, render preview và tài khoản thường không gọi API cấu hình riêng.
