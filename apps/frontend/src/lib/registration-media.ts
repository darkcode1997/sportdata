const MAX_UPLOAD_BYTES = 1_000_000;
const MAX_DOCUMENT_BYTES = 3_300_000;
const MAX_IMAGE_EDGE = 1800;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Không thể tối ưu ảnh đã chọn.')),
      'image/jpeg',
      quality,
    );
  });
}

export async function optimizeRegistrationMedia(file: File) {
  if (!file.type.startsWith('image/')) {
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new Error('Tệp PDF phải nhỏ hơn 3,3 MB khi đăng ký trực tuyến.');
    }
    return file;
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const initialScale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    let quality = 0.86;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Trình duyệt không hỗ trợ tối ưu ảnh.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasBlob(canvas, quality);
      if (blob.size <= MAX_UPLOAD_BYTES) {
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'sportdata-media';
        return new File([blob], `${baseName}.jpg`, {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });
      }
      quality = Math.max(0.5, quality - 0.08);
      if (attempt >= 3) {
        width = Math.max(1, Math.round(width * 0.82));
        height = Math.max(1, Math.round(height * 0.82));
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error('Ảnh quá lớn để tải lên. Vui lòng chọn ảnh có độ phân giải thấp hơn.');
}

