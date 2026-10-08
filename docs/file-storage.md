# Lưu trữ file

Ảnh VĐV, CCCD/hộ chiếu, file đăng ký tạm, ảnh sự kiện, nền vé, banner, logo và chunk import backup dùng chung `StorageService` với Strategy Pattern. PostgreSQL chỉ lưu định danh file và metadata. File mới được lưu theo `STORAGE_DRIVER`:

| Giá trị | Nơi lưu |
| --- | --- |
| `local` (mặc định) | Folder của backend |
| `cloudinary` | Cloudinary |
| `s3` | AWS S3 hoặc dịch vụ tương thích S3 |
| `r2` | Cloudflare R2, qua S3 API |

## Local

```dotenv
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=static/uploads
STORAGE_TIMEOUT_MS=30000
```

Đường dẫn tương đối tính từ thư mục chạy tiến trình backend. Với `npm run dev:backend`, folder mặc định là `apps/backend/static/uploads`. Có thể dùng đường dẫn tuyệt đối. Docker Compose cấu hình `/app/storage` và volume `sportdata_storage` để giữ file khi tạo lại container; hai backend production chia sẻ volume này.

Folder này không được mount thành static HTTP công khai. Ảnh được trả qua API hiện tại, còn giấy tờ qua API có kiểm tra quyền. File được tạo với quyền `0600`, folder với `0700`. Khi chạy trên nhiều máy chủ, dùng filesystem chia sẻ hoặc chọn cloud. Với serverless như Vercel, chọn Cloudinary/S3 vì folder local không bền vững giữa các instance.

## Cloudinary

```dotenv
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
STORAGE_TIMEOUT_MS=30000
```

Backend dùng SDK Cloudinary để upload bằng `upload_stream` với `type=authenticated`. JPG, PNG, WebP và AVIF được upload đúng loại `image`, public ID không có đuôi file; khi đọc, adapter dùng định dạng gốc. PDF dùng `raw` với đuôi `.pdf`. Chunk backup được mã hóa Base64 thành file `raw` đuôi `.txt`, rồi giải mã khi đọc để giữ nguyên từng byte và checksum. Không dùng đuôi `.bin` cho upload mới vì Cloudinary có thể chặn định dạng này.

Storage key Cloudinary mới lưu kèm loại/định dạng, ví dụ `cloudinary:v2/image/png/athletes/avatars/uuid`. Đọc và xóa dùng đúng loại tương ứng. Các định danh Cloudinary cũ vẫn được hỗ trợ đọc/xóa. Thay đổi này không cần migration database.

Backend tạo URL có chữ ký để đọc file. Ảnh công khai có thể redirect tới CDN khi frontend yêu cầu một kích thước hiển thị; giấy tờ vẫn trả nội dung qua API có kiểm tra quyền, không redirect hay trả URL Cloudinary cho frontend. API secret chỉ cấu hình ở backend. Xem [Cloudinary upload streams](https://cloudinary.com/documentation/node_image_and_video_upload#the_upload_stream_method) và [Authenticated media assets](https://cloudinary.com/documentation/control_access_to_media#authenticated_media_assets).

### Resize khi upload

Ảnh mới được resize bằng incoming transformation của Cloudinary trước khi lưu. `crop=limit` giữ tỷ lệ, chỉ thu nhỏ ảnh quá giới hạn và không cắt nội dung. Mặc định:

| Ảnh | Khung tối đa |
| --- | --- |
| Avatar VĐV, kể cả upload đăng ký tạm | 800 × 1200 px |
| Ảnh CCCD/hộ chiếu | 2400 × 2400 px |
| Banner, logo, ảnh sự kiện, nền vé | 1920 × 1920 px |

```dotenv
CLOUDINARY_RESIZE_ENABLED=true
CLOUDINARY_AVATAR_MAX_WIDTH=800
CLOUDINARY_AVATAR_MAX_HEIGHT=1200
CLOUDINARY_DOCUMENT_MAX_WIDTH=2400
CLOUDINARY_DOCUMENT_MAX_HEIGHT=2400
CLOUDINARY_IMAGE_MAX_WIDTH=1920
CLOUDINARY_IMAGE_MAX_HEIGHT=1920
CLOUDINARY_IMAGE_QUALITY=auto:good
```

Kích thước cho phép từ 1 đến 10000 px. Chất lượng có thể là `auto`, `auto:best/good/eco/low`, hoặc số 1–100; để trống để bỏ tối ưu chất lượng. `CLOUDINARY_RESIZE_ENABLED=false` bỏ toàn bộ incoming transformation. Định dạng ảnh gốc được giữ để MIME type và vé PDF tương thích; không dùng `f_auto` khi upload.

Ví dụ avatar 2433 × 3651 px được thu về khoảng 800 × 1200 px; ảnh nhỏ hơn khung được giữ kích thước. DB lưu dung lượng Cloudinary trả về sau khi xử lý. Các file PDF và chunk backup không bị resize. Ảnh đã upload trước đó cần upload lại nếu muốn áp dụng giới hạn mới. Resize diễn ra sau khi backend nhận ảnh, nên không giảm dung lượng request từ trình duyệt tới backend. Xem [Incoming transformations](https://cloudinary.com/documentation/eager_and_incoming_transformations#incoming_transformations) và [Resize modes](https://cloudinary.com/documentation/resizing_and_cropping).

### Ảnh thu nhỏ và preview trên frontend

Frontend dùng `imageUrl(source, variant)` trong `apps/frontend/src/lib/image-url.ts`. Ví dụ:

```tsx
<Avatar src={imageUrl(athlete.photoUrl, 'avatar')} />
<Image
  src={imageUrl(banner.imageUrl, 'card')}
  preview={{ src: imageUrl(banner.imageUrl, 'preview') }}
/>
```

| `variant` | Khung tối đa | Cách xử lý |
| --- | --- | --- |
| `avatar` | 96 × 96 px | Cắt vuông, ưu tiên khuôn mặt |
| `portrait` | 320 × 480 px | Giữ tỷ lệ, chỉ thu nhỏ |
| `logo` | 240 × 240 px | Giữ tỷ lệ, chỉ thu nhỏ |
| `card` | 640 × 480 px | Giữ tỷ lệ, chỉ thu nhỏ |
| `preview` | 1600 × 1600 px | Giữ tỷ lệ, chỉ thu nhỏ |
| `hero` | 1600 × 900 px | Giữ tỷ lệ, chỉ thu nhỏ |

Ví dụ `/api/participant-auth/avatar/id?v=0&variant=avatar` được backend chuyển hướng bằng HTTP 302 tới URL Cloudinary có chữ ký và transformation `c_fill,g_face,h_96,q_auto:good,w_96`. Trình duyệt tải bản WebP từ CDN. Banner trang chủ có `srcSet` 640/1600 px để chọn ảnh theo màn hình. URL Cloudinary công khai dạng `/image/upload/` do CMS nhập trực tiếp được helper thêm transformation cùng `f_auto,q_auto:good`; URL có chữ ký không bị sửa.

Cloudinary không tạo transformation tự động qua URL cho asset `authenticated`. Backend dùng `explicit` với `eager` để tạo bản được yêu cầu lần đầu, kể cả ảnh đã upload trước đó. Trước khi tạo, backend kiểm tra bản có sẵn trên CDN; URL được cache trong RAM một giờ, tối đa 2000 bản, và các request đồng thời cho cùng một bản dùng chung tác vụ. Lần xem đầu có thể chậm hơn do tạo transformation và dùng quota Cloudinary; các lần sau tái sử dụng bản đó. Chỉ sáu preset trên được API chấp nhận, giá trị khác trả 400. Nếu xử lý transformation lỗi, backend ghi log và trả ảnh gốc.

CCCD/hộ chiếu ở tài khoản và modal VĐV tải `card` làm thumbnail. Component `ProtectedImage` chỉ tải bản `preview` khi mở xem, bằng request có token như trước, và giải phóng blob URL khi đóng/unmount. Giữ định dạng gốc khi trả ảnh giấy tờ để MIME type nhất quán; PDF không được resize. API không truyền `variant` vẫn đọc ảnh gốc, bao gồm xuất vé PDF. File local/S3/R2 được đọc theo cách hiện tại; provider được xác định từ storage key của từng file, nên đổi config không làm hỏng ảnh đã lưu bằng provider khác.

Tính năng này độc lập với `CLOUDINARY_RESIZE_ENABLED`: biến đó điều khiển resize khi upload; preset hiển thị tiếp tục hoạt động khi tắt biến đó. Cần khởi động lại backend/frontend sau khi triển khai code mới, không cần thêm config hoặc migration cho preview.

## S3

```dotenv
STORAGE_DRIVER=s3
STORAGE_S3_BUCKET=sportdata
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ENDPOINT=
STORAGE_S3_ACCESS_KEY_ID=your-access-key
STORAGE_S3_SECRET_ACCESS_KEY=your-secret-key
STORAGE_S3_FORCE_PATH_STYLE=false
STORAGE_TIMEOUT_MS=30000
```

Để endpoint trống khi dùng AWS S3; điền endpoint của dịch vụ tương thích S3 nếu dùng nhà cung cấp khác. Một số dịch vụ cần `STORAGE_S3_FORCE_PATH_STYLE=true`. Có thể bỏ trống hai access key để dùng credential chain/IAM role của AWS SDK. Bucket phải có sẵn và được cấu hình private; tài khoản backend cần quyền đọc, ghi và xóa object. Xem [AWS SDK S3 examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html).

## Cloudflare R2

R2 có lựa chọn riêng `STORAGE_DRIVER=r2`, dùng adapter S3 hiện có với `region=auto`, endpoint Cloudflare và credential R2 riêng. Không cần thêm dependency, sửa frontend hoặc migration database để dùng R2.

```dotenv
STORAGE_DRIVER=r2
STORAGE_R2_BUCKET=sportdata
STORAGE_R2_ACCOUNT_ID=your-32-character-cloudflare-account-id
STORAGE_R2_ACCESS_KEY_ID=your-r2-access-key-id
STORAGE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
STORAGE_R2_ENDPOINT=
STORAGE_TIMEOUT_MS=30000
```

### Cấu hình trên Cloudflare

1. Mở **R2 object storage**, tạo bucket, ví dụ `sportdata`.
2. Vào **Manage R2 API tokens**, tạo token có quyền **Object Read & Write**, giới hạn vào bucket đó.
3. Lưu **Access Key ID**, **Secret Access Key** và Account ID vào `.env` backend. Dùng cặp S3 credentials này, không điền Cloudflare API token vào Secret Access Key.
4. Khởi động lại backend. Docker Compose local và production đã truyền các biến `STORAGE_R2_*` cho backend.

Để `STORAGE_R2_ENDPOINT` trống, adapter tự dùng `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Nếu bucket có jurisdiction, điền đúng **S3 API endpoint** từ Dashboard, ví dụ `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`. Khi đã điền endpoint thì Account ID có thể để trống. Endpoint không chứa tên bucket; không dùng URL `r2.dev` hoặc custom domain public làm endpoint S3. Backend kiểm tra bucket, credential, Account ID và định dạng endpoint khi khởi động. HTTPS bắt buộc cho endpoint ngoài; HTTP localhost được phép cho môi trường giả lập khi phát triển. Xem [R2 với AWS SDK v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), [R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/) và [jurisdiction endpoints](https://developers.cloudflare.com/r2/reference/data-location/#using-jurisdictions-with-the-s3-api).

### Hành vi trong ứng dụng

- File mới có định danh `r2:athletes/avatars/uuid`, `r2:athletes/documents/uuid`, `r2:backup-chunks/uuid`, v.v. PostgreSQL chỉ lưu key và metadata.
- Upload, đọc, xóa, timeout và dọn file khi DB lỗi dùng cùng luồng storage hiện tại. JPG/PNG/WebP/AVIF, PDF và chunk backup được lưu nguyên byte.
- Giữ bucket private, không bật public access cho bucket chung chứa CCCD/hộ chiếu. Backend đọc file bằng S3 API rồi trả qua API ứng dụng; các guard của giấy tờ vẫn được áp dụng. Trình duyệt không truy cập bucket trực tiếp, nên không cần cấu hình R2 CORS cho luồng này.
- R2 lưu object; tính năng resize Cloudinary chỉ áp dụng cho key `cloudinary:...`. Với file `r2:...`, request `variant` trả ảnh gốc. Nếu muốn resize ảnh R2 theo URL, cần tích hợp thêm [Cloudflare Images transformations](https://developers.cloudflare.com/images/optimization/transformations/overview/).
- Đổi driver không tự chuyển file. Giữ cấu hình Cloudinary/S3 hoặc folder local để đọc file cũ. Ngược lại, khi chuyển khỏi R2, giữ đủ cấu hình R2 để đọc/xóa các key `r2:...`.
- Nếu trước đó dùng R2 thông qua `STORAGE_DRIVER=s3`, các key cũ vẫn là `s3:...`; giữ bộ biến `STORAGE_S3_*` trỏ tới bucket cũ. Không cần đổi key hoặc di chuyển dữ liệu.

## Schema và triển khai

```sh
npm run prisma:generate
npm run prisma:deploy
npm run build:backend
```

Migration `20261008000000_external_file_storage` thay các cột Bytes bằng storage key, **bỏ nội dung Bytes cũ và không chuyển file cũ**. Chỉ chạy migration khi đã sẵn sàng bỏ dữ liệu đó. Các bản ghi cũ có key trống sẽ trả 404 khi đọc file; upload lại để tạo file mới. Khởi động lại backend sau khi đổi config.

Định danh lưu trong DB có dạng `local:folder/uuid`, `cloudinary:v2/image/png/folder/uuid` (hoặc định danh raw tương ứng), `s3:folder/uuid` và `r2:folder/uuid`. Đổi driver chỉ ảnh hưởng file mới. Để đọc file cũ, giữ folder local và cấu hình credential của provider cũ; đổi bucket/tài khoản/folder gốc không tự di chuyển file.

Upload được thực hiện trước khi mở transaction nghiệp vụ; DB lỗi thì file mới được dọn. Khi thay/xóa file, storage cũ được dọn sau khi DB thành công. File đăng ký tạm hết hạn và chunk backup được dọn khi phiên được xử lý/hủy hoặc khi tạo upload tiếp theo. Lỗi dọn file được ghi log để xử lý lại.

Backup JSONL của DB chứa metadata/định danh, **không chứa nội dung file ngoài DB**. Cần sao lưu folder/volume hoặc tài nguyên cloud riêng, giữ cùng thời điểm với backup DB. Bản backup theo schema Bytes cũ không tương thích với schema mới.
