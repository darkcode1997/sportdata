# Thiết kế tài khoản SportData và nghiệp vụ người tham gia

Ngày phân tích: 10/10/2026. Đây là đề xuất nghiệp vụ, chưa phải danh sách tính năng đã triển khai.

## Hiện trạng đã kiểm tra

- `ParticipantAccount` hiện có `ATHLETE` và `FEDERATION`; chưa có HLV, người dùng thường, trọng tài, trưởng đoàn hoặc y tế.
- CMS dùng bảng `User` riêng với ADMIN, CONTENT, GAMES_ADMIN và READ_ONLY. Không có loại tài khoản Event Manager trong schema; tên này là lựa chọn trên trang đăng nhập công khai dẫn sang CMS.
- API người tham gia dùng token `type=participant`. API CMS dùng JWT và tài khoản `User`. Cần từ chối rõ token participant tại lớp xác thực CMS.
- Người tham gia đã có hồ sơ, giấy tờ, đăng ký và thẻ. API đổi hạng hiện chỉ dành cho ADMIN/GAMES_ADMIN.
- Đổi hạng hiện kiểm tra cùng sự kiện/bộ môn, điều kiện VĐV, trùng nội dung, hạn ngạch quốc gia và dữ liệu bốc thăm/lịch; cập nhật lượt đăng ký và suất thi đấu trong transaction. Không nên mở trực tiếp API này cho VĐV vì chưa có chính sách tự đổi, quyền sở hữu, hạn đổi và xử lý phí cho luồng người dùng.

## Mô hình đề xuất

Một tài khoản cá nhân đăng nhập trên trang người dùng. Một người có thể vừa là HLV vừa là VĐV; không tạo nhiều tài khoản chỉ vì có nhiều vai trò.

- Vai trò: USER, ATHLETE, COACH, REFEREE, DELEGATION_LEADER, MEDICAL.
- Vai trò tự khai chỉ là hồ sơ đăng ký. Quyền làm việc phát sinh sau khi xác minh hoặc phân công.
- Phân công gồm tài khoản, vai trò, sự kiện, đơn vị/đoàn, phạm vi trận/khu vực nếu cần, trạng thái và người duyệt.
- Liên đoàn/CLB là đơn vị; quyền đại diện quản lý được cấp cho người cụ thể. Cần quyết định phương án chuyển các tài khoản FEDERATION hiện có, không tự xóa hoặc đổi quyền.
- Tài khoản CMS được quản lý riêng. Các vai trò công khai không được tạo tài khoản CMS hay dùng token công khai gọi API CMS.
- Event Manager được bỏ khỏi trang đăng nhập công khai. GAMES_ADMIN vẫn là vai trò CMS hiện có, không đồng nghĩa xóa nhân sự hay dữ liệu vận hành.

## Quyền và nghiệp vụ theo vai trò

| Vai trò | Khu vực tài khoản và thao tác | Phạm vi / điều kiện |
| --- | --- | --- |
| Người dùng thường | Hồ sơ cơ bản, sự kiện theo dõi, thông báo; đăng ký vai trò VĐV khi cần thi đấu | Dữ liệu của bản thân; không bắt buộc giấy tờ VĐV chỉ để tạo tài khoản |
| Vận động viên | Hồ sơ thể thao, giấy tờ, đăng ký, thanh toán, thẻ, lịch/kết quả; đổi hạng hoặc xin rút | Lượt đăng ký gắn với hồ sơ VĐV của mình; đăng ký do đoàn nộp phải theo cơ chế phối hợp với đoàn |
| Huấn luyện viên | Danh sách VĐV được giao, lịch thi đấu, hỗ trợ hồ sơ và đề nghị đổi hạng | Chỉ VĐV có quan hệ được xác nhận; không mặc nhiên xem mọi VĐV cùng CLB, không tự duyệt đề nghị |
| Trưởng đoàn | Danh sách đoàn, mời HLV/VĐV, đăng ký theo đoàn, theo dõi phí/hồ sơ, đề nghị thay đổi và xuất danh sách | Đoàn và sự kiện được phân công; không mặc nhiên có quyền trên toàn bộ liên đoàn |
| Trọng tài | Xác nhận tham gia, nhận lịch/phân công, xem thông tin cần thiết, nhập biên bản/điểm và gửi xác nhận | Chỉ trận được giao; không tự sửa kết quả đã khóa/công bố, không duyệt cuối kết quả của chính mình |
| Y tế viên | Nhận ca/khu vực, ghi nhận sự cố, cập nhật kết luận đủ/không đủ điều kiện tham gia theo quy trình BTC | Sự kiện được giao; dữ liệu y tế chi tiết chỉ dành cho người có quyền. HLV/trưởng đoàn chỉ thấy trạng thái cần thiết |

BTC duyệt hồ sơ, phân công, yêu cầu thay đổi và công bố kết quả từ CMS theo quyền hiện có. Không cấp quyền CMS cho người tham gia để thực hiện những thao tác này.

## Đổi hạng đấu của VĐV

### Luồng đề xuất

1. Vào Tài khoản → Đăng ký của tôi → chọn lượt đăng ký → Đổi hạng đấu.
2. Hiển thị hạng hiện tại, hạn đổi và danh sách hạng phù hợp trong cùng sự kiện/bộ môn.
3. Chọn hạng mới, nhập lý do, xem thay đổi phí và tác động đến hồ sơ/thẻ.
4. Hồ sơ SUBMITTED, còn hạn, chưa phát sinh bốc thăm/lịch và không vướng thanh toán: cho tự đổi nếu sự kiện bật quyền này.
5. Hồ sơ CONFIRMED hoặc đăng ký do đoàn quản lý: tạo yêu cầu; thông báo đoàn/BTC theo cấu hình. Hạng cũ vẫn có hiệu lực trong khi chờ.
6. BTC duyệt hoặc từ chối có lý do; khi duyệt phải kiểm tra lại toàn bộ điều kiện theo dữ liệu mới nhất.
7. Đồng bộ đăng ký, suất thi đấu và nội dung thẻ; thông báo các bên, lưu lịch sử trước/sau và người thực hiện.

### Điều kiện bắt buộc

- Kiểm tra quyền bằng hồ sơ VĐV/ủy quyền thực tế; `accountId` của người nộp hồ sơ không đủ để chứng minh VĐV sở hữu lượt đăng ký do đoàn nộp.
- Kiểm tra hạn riêng `categoryChangeDeadline`, trạng thái sự kiện/đăng ký và khóa danh sách. Không cho tự đổi đăng ký đã hủy/từ chối.
- Hạng đích phải thuộc cùng sự kiện và bộ môn, đáp ứng tuổi, giới tính, cân nặng/trình độ và điều lệ được cấu hình; không mở tự đổi đội/tiếp sức bằng luồng cá nhân.
- Không trùng lượt đăng ký/nội dung, không vượt hạn ngạch hoặc sức chứa áp dụng.
- Đã bốc thăm/lên lịch ở hạng cũ hoặc hạng mới: khóa thao tác thông thường. Ngoại lệ phải qua quy trình BTC hoàn tác và tạo lại dữ liệu thi đấu, không tự làm từ tài khoản VĐV.
- Một yêu cầu đang chờ cho mỗi lượt đăng ký. Duyệt yêu cầu cũ phải từ chối nếu hạng hoặc phiên bản đăng ký đã thay đổi.
- Dùng transaction và cùng khóa với bốc thăm; kiểm tra lại lúc xác nhận, chống gửi lặp và duyệt đồng thời.

### Phí và thanh toán

- Cần chốt trước khi mở chức năng: giữ phí theo lượt đăng ký hay tính lại theo hạng đích.
- Nếu bằng phí: đổi không tạo thanh toán mới.
- Nếu tăng phí: tạo khoản chênh lệch và quy định rõ giữ chỗ/hạn thanh toán; chưa hoàn tất điều kiện thì chưa xác nhận hạng mới.
- Nếu giảm phí: ghi nhận khoản hoàn theo chính sách BTC, không tự sửa giao dịch đã thanh toán thành giá trị khác.
- Khi giao dịch đang xử lý: tạm khóa đổi hoặc chờ đối soát; tránh nhận callback thanh toán cho phí/hạng cũ sau khi đã đổi.

## Các luồng phối hợp khác

- HLV/trưởng đoàn đề nghị thay đổi: chọn VĐV trong phạm vi được giao → ghi lý do → kiểm tra điều kiện → xác nhận của VĐV/đoàn nếu cần → BTC duyệt. Lưu người đề nghị và người duyệt riêng.
- Trọng tài: được BTC mời → xác nhận/khước từ → nhận phân công → nộp biên bản → xác nhận chuyên môn → BTC duyệt/công bố. Xung đột vai trò VĐV/HLV tại trận cần được phát hiện trước phân công.
- Y tế: nhận phân công → ghi nhận ca sự cố → cập nhật trạng thái tham gia → thông báo người cần xử lý. Nội dung bệnh án không đưa vào thông báo chung hoặc API danh sách đoàn.
- Thu hồi phân công có hiệu lực ở API ngay; không chỉ ẩn menu. Mọi quyền sửa cần được kiểm tra ở backend theo bản ghi cụ thể.

## Giao diện đề xuất

Một form đăng nhập cá nhân trên trang công khai, không yêu cầu chọn vai trò trước đăng nhập. Sau đăng nhập, menu được tạo từ vai trò đã xác minh và phân công đang hiệu lực; người có nhiều vai trò chuyển khu vực trong cùng tài khoản.

Menu chung: Tổng quan, Hồ sơ, Sự kiện của tôi, Thông báo, Bảo mật. Menu theo quyền: Thi đấu của tôi, VĐV được giao, Đoàn của tôi, Phân công trọng tài, Nhiệm vụ y tế.

Đăng ký hỏi vai trò mong muốn; cho người dùng thường tạo tài khoản với hồ sơ tối thiểu. Chứng chỉ/giấy tờ được bổ sung ở bước xin xác minh vai trò phù hợp. Không hiển thị sáu nút đăng nhập mà backend chưa hỗ trợ.

## Triển khai và chuyển đổi

1. Bỏ Event Manager khỏi trang công khai; kiểm tra cách ly token CMS/người tham gia.
2. Thêm vai trò cá nhân, phân công theo sự kiện/đoàn và quy trình xác minh; giữ tương thích dữ liệu ATHLETE/FEDERATION trong lúc chuyển đổi. Chỉ gán vai trò mới sau khi xác định được chủ sở hữu/đại diện.
3. Xây menu tài khoản theo quyền và API nghiệp vụ riêng. Không tái sử dụng endpoint CMS từ giao diện người dùng.
4. Làm yêu cầu đổi hạng, lịch sử, hạn đổi, thông báo và thanh toán chênh lệch theo chính sách đã chốt.
5. Mở luồng HLV/trưởng đoàn trước; sau đó trọng tài và y tế với phân công và quyền truy cập riêng.

Kiểm chứng cần có: mọi loại token người tham gia bị từ chối tại CMS; người không được phân công không đọc/sửa được dữ liệu khác; trường hợp đổi hạng còn/hết hạn, đã duyệt, đã bốc thăm, không phù hợp, trùng, thanh toán và tranh chấp đồng thời; thu hồi quyền; không lộ dữ liệu y tế; dữ liệu/thẻ/đăng ký cũ giữ nguyên sau migration.

## Những quyết định còn cần chốt

- Tự đổi trước duyệt hay mọi thay đổi đều phải BTC duyệt?
- Giữ tài khoản FEDERATION riêng hay chuyển sang người đại diện có phân quyền?
- Đăng ký do đoàn nộp: VĐV có thể tự đổi hay cần trưởng đoàn xác nhận?
- Phí khi đổi hạng: giữ nguyên, thu thêm/hoàn, hay chỉ hỗ trợ các hạng cùng phí ở giai đoạn đầu?
- Ai xác minh chuyên môn HLV/trọng tài/y tế, ai duyệt phân công và kết quả?
