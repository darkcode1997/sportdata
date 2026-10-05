# Pre-matches và Preview cây đấu

Áp dụng các migration, bao gồm `20261005000000_restore_admin_draw_permission`, chạy `npm run prisma:generate`, rồi khởi động lại backend.

**Đặt trước cặp & preview cây đấu** (`DRAW_PRECONFIGURE`) là quyền riêng, chỉ được cấp cho tài khoản **Quản trị hệ thống** (`ADMIN`) tại **Tài khoản CMS → Chỉnh sửa → Quyền riêng**. Admin phải có quyền này mới được cấu hình, preview và xem lịch sử. Quản lý sự kiện không được dùng các API này, kể cả nếu dữ liệu cũ chứa quyền riêng. Migration khôi phục quyền cho admin hiện có; admin mới cần được cấp riêng. JWT đọc vai trò và quyền hiện tại từ database mỗi request.

Trong workspace sự kiện, chọn hạng đấu rồi cấu hình Pre-matches phía trên phần chọn thể thức. Cả năm thể thức loại trực tiếp, tuyệt đối, loại kép, đấu vớt và vòng tròn đều hỗ trợ. Admin có quyền riêng chọn hai CompetitionEntry và hệ thống tự lưu; xóa cặp cũng tự lưu. Mỗi lần lưu tăng revision và vô hiệu hóa preview trước đó. Cách xếp seed cũng được tự lưu tại đây. Khi có lỗi lưu, xử lý lỗi hoặc tải lại trước khi preview.

**Preview cây đấu** lưu phương án hoàn chỉnh trên server, gồm slot đầu vào, trận, miễn đấu và liên kết thắng/thua các vòng tiếp theo, nhưng không tạo bản ghi Draw, Match hoặc bảng vòng tròn. Đối với loại kép và đấu vớt, cặp đặt trước chỉ áp dụng vòng đầu nhánh chính; preview vẫn hiển thị đầy đủ nhánh phụ. SportdataBracket dùng chính graph này để hiển thị.

Vòng tròn cho phép chọn số bảng trong Pre-matches. Cặp đặt trước được xếp cùng bảng và gặp nhau ở lượt đầu; các lượt sau dùng vòng xoay để mỗi cặp VĐV trong bảng gặp nhau đúng một lần, mỗi VĐV thi đấu tối đa một trận mỗi lượt. Số bảng và danh sách thành viên được lưu cùng preview; khi sinh mới tạo RoundRobinGroup, thành viên và MatchParticipant. Đấu vớt dưới 6 VĐV dùng vòng tròn một bảng nhưng vẫn giữ cấu hình riêng REPECHAGE. Loại kép cần ít nhất 4 VĐV. Các cấu hình được lưu theo drawType; loại trực tiếp và tuyệt đối cùng sử dụng MAIN_TREE.

Khi người vận hành bất kỳ sinh nhánh, backend kiểm tra phiên bản đầu vào rồi dùng graph đã lưu, giữ nguyên ID trận, vị trí VĐV và liên kết tiến nhánh. Cách xếp seed, tên cây và các lựa chọn khác do người gọi gửi không thay thế phương án đã preview. Số trận được cấp nối tiếp tại thời điểm preview và giữ nguyên khi sinh; nếu một nhánh khác đã sử dụng dải số này, yêu cầu bị từ chối và cần preview lại.

Phiên bản bao gồm toàn bộ danh sách CompetitionEntry của hạng, trạng thái, seed, thông tin VĐV và đơn vị/quốc gia, liên kết đăng ký, điều kiện hạng, giới hạn tuổi sự kiện, ngày thi đấu, danh sách FOP, cặp và lựa chọn preview. Dữ liệu thay đổi làm sinh nhánh trả HTTP 409, yêu cầu người có quyền preview lại. Hạng chưa từng có cấu hình riêng vẫn sinh tự động theo luồng thông thường. Một cấu hình đã lưu, kể cả không có cặp, phải có preview hợp lệ.

Đầu vào phải gồm toàn bộ lượt đăng ký cá nhân VERIFIED, đúng sự kiện/hạng và đáp ứng giới tính, cân nặng, tuổi áp dụng. Không được dùng trùng VĐV. Với cây loại trực tiếp, kích thước cây B là lũy thừa hai nhỏ nhất chứa N VĐV. Để mọi trận vòng đầu có ít nhất một VĐV, số cặp cố định tối đa là `N − B/2`; ví dụ 5 VĐV có cây 8 vị trí, tối đa một cặp cố định và ba miễn đấu. Với vòng tròn, các bảng được chia đều và tối đa `floor(số VĐV của bảng / 2)` cặp đặt trước cho mỗi bảng. Cặp đặt trước ưu tiên hơn việc tách seed, CLB hoặc quốc gia.

Cấu hình và phương án không được đưa vào các API Draw/Match thông thường. Người không có quyền không thấy hoặc tải phần Pre-matches, Preview, lịch sử hoặc dấu hiệu cặp chỉ định. Lịch sử riêng ghi người thao tác, revision và snapshot khi cấu hình, preview hoặc sinh nhánh; không chỉnh sửa lịch sử qua API.

## Phân bổ hạt giống

Mọi chế độ giữ thứ tự hạt giống theo số seed tăng dần, kể cả RANDOM, ORDERED, tách quốc gia và tách CLB. Seed 1/2 thuộc hai nửa cây; bốn seed đầu thuộc bốn phần tư; tám seed đầu thuộc tám phần tám, tiếp tục tương tự. Số seed bị khuyết được xếp theo thứ tự tương đối của các seed thực tế. Với tám VĐV đều có seed, các cặp vòng đầu là `1–8, 4–5, 2–7, 3–6`. Các miễn đấu được ưu tiên cho seed cao nhất.

VĐV không có seed được xếp sau các seed; RANDOM chỉ đảo các VĐV này. Tách quốc gia/CLB chỉ đổi chỗ VĐV không seed để giảm cặp cùng đơn vị/quốc gia ở vòng đầu, giữ vị trí seed và miễn đấu. Hệ thống chưa có dữ liệu sức mạnh để phân biệt VĐV không seed, nên không khẳng định ai yếu nhất trong nhóm này.

Cặp Pre-matches là một khối không tách, được bố trí cùng các seed theo thứ tự ưu tiên. Các vị trí được chọn để trì hoãn lần gặp sớm nhất giữa các seed còn lại, ưu tiên vị trí chuẩn khi tương đương, đồng thời giữ đủ trận cho những cặp cố định và đủ VĐV cho các trận còn trống. Một cặp chỉ định giữa hai seed hoặc số lượng cặp chỉ định quá lớn có thể buộc các seed gặp sớm hơn. Thuật toán này dùng chung cho preview và sinh nhánh chính của loại trực tiếp, tuyệt đối, loại kép và đấu vớt; vòng tròn vẫn thi đấu đủ mọi đối thủ trong bảng.

Phiên bản thuật toán đã tăng lên 2. Preview đã lưu bằng thuật toán cũ phải được preview lại trước khi sinh; cây đã sinh cần thu hồi rồi chia lại nếu chưa có trận bắt đầu.

Mọi thao tác ghi được thực hiện trong transaction PostgreSQL Serializable, khóa event để phân bổ số trận và kiểm tra tồn tại trước khi ghi. Yêu cầu sinh đồng thời cho cùng phương án chỉ có một yêu cầu thành công; các yêu cầu còn lại trả 409. Cấu hình dùng revision để từ chối chỉnh sửa đè lên phiên bản của người khác.

## Thu hồi nhánh trước khi thi đấu

Trong phần chọn thể thức, người có quyền sinh nhánh thấy **Thu hồi nhánh đấu** khi hạng đang chọn đã có cây/bảng. Sau xác nhận, hệ thống xóa toàn bộ nhánh, bảng vòng tròn và trận thuộc các nhánh/bảng của hạng đó, gồm lịch trận đã xếp. Các lượt đăng ký, seed, FOP và trận nhập riêng ngoài nhánh/bảng được giữ. Thu hồi theo hạng, không ảnh hưởng các hạng khác.

Chỉ cho thu hồi khi chưa có trận nào trong hạng bắt đầu hoặc ghi nhận kết quả. Trận miễn đấu tự động không được tính là đã thi đấu. Mở/giữ quyền điều khiển bảng điểm hoặc xếp lịch chưa được tính là bắt đầu. Trận đang chạy, tạm dừng, đã kết thúc, có kết quả, hoặc đã mở lại sau thi đấu đều chặn thu hồi. Nếu cây có liên kết với trận ngoài phạm vi xóa, hệ thống cũng từ chối để giữ nguyên cây liên quan.

Thu hồi giữ cặp Pre-matches và cấu hình, vô hiệu hóa phương án preview cũ và tăng revision. Sau đó chỉnh seed, preview lại bằng tài khoản có quyền, rồi sinh nhánh. Hạng không có cấu hình riêng có thể sinh lại trực tiếp. Lịch sử riêng ghi `REVERT`; audit chung ghi người thu hồi và số nhánh/bảng/trận bị xóa.

API vận hành (JWT và vai trò được phép sinh nhánh, không cần quyền riêng), với cùng tiền tố event/category:

- `GET /draw-state`: `{ version, canRevert, drawCount, groupCount, matchCount, reason }`.
- `POST /revert-draw`: `{ version }`, dùng version từ GET. Version cũ, hạng đã bắt đầu hoặc yêu cầu thu hồi trùng trả 409.

Thu hồi, sinh cây và thao tác START/FINISH dùng chung khóa event. Thu hồi còn khóa các trận trong transaction để kiểm tra lại trạng thái trước khi xóa; bắt đầu trận và thu hồi đồng thời không thể xóa một trận đã bắt đầu.

## API riêng

Các đường dẫn dưới đây có tiền tố `/api/matches/event/:eventId/category/:categoryId` và yêu cầu JWT với vai trò `ADMIN` cùng quyền `DRAW_PRECONFIGURE`:

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
node tests/regression/draw-seeding.mjs
node tests/regression/draw-preconfiguration.mjs
```

Smoke test mới dùng database URL từ môi trường hoặc `.env`, chỉ cho phép PostgreSQL localhost. Script tạo schema tạm, áp dụng migration, chạy HTTP API thật với tài khoản tạm rồi xóa schema trong `finally`; không thay đổi tài khoản và dữ liệu ứng dụng hiện có. Bao phủ 2–65 VĐV ở năm cách xếp seed, A–C → preview → đổi tài khoản → sinh đúng cây, quyền API và thu hồi quyền, miễn đấu, version thay đổi, revision cũ, dữ liệu riêng, loại kép, đấu vớt 6/16 VĐV, đấu vớt dưới 6, vòng tròn nhiều bảng, tuyệt đối và bốn yêu cầu sinh đồng thời. Kiểm thử thu hồi bao phủ cây có miễn đấu, giữ seed/cặp, chia lại, dọn bảng/thành viên/MatchParticipant, quyền vận hành, version cũ, thu hồi đồng thời và START đồng thời với thu hồi.

Kiểm tra giao diện bằng Playwright với frontend đang chạy (toàn bộ API được mock, không ghi dữ liệu):

```sh
node tests/regression/draw-preconfiguration-ui.mjs
```

Có thể đặt `DRAW_PLAYWRIGHT_MODULE` để trỏ đến Playwright cài sẵn, `DRAW_CHROME_PATH` cho executable Chrome, `DRAW_UI_URL` cho URL frontend và `DRAW_SCREENSHOT_PATH` để lưu ảnh chụp. Bài kiểm tra xác nhận chọn một VĐV chưa lưu, chọn đủ hai tự lưu đúng Entry ID, xóa cặp tự lưu, render preview và tài khoản Quản lý sự kiện không gọi API cấu hình riêng.
