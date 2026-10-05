'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  App,
  Button,
  Card,
  Flex,
  Progress,
  Result,
  Spin,
  Tag,
  Typography,
  Upload,
  type UploadFile,
} from 'antd';
import {
  ArrowLeft,
  DatabaseBackup,
  Download,
  FileArchive,
  HardDriveUpload,
  LockKeyhole,
  ShieldAlert,
} from 'lucide-react';
import { getAuthToken } from '@/lib/api';

const MAX_BACKUP_FILE_SIZE = 2 * 1024 * 1024 * 1024;

type AuthState = 'checking' | 'allowed' | 'forbidden';
type ImportResult = {
  success: boolean;
  rows: number;
  tables: Record<string, number>;
  createdAt: string;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Uint8Array) => Promise<void>;
      close: () => Promise<void>;
      abort: () => Promise<void>;
    }>;
  }>;
};

export default function HiddenBackupPage() {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transferredBytes, setTransferredBytes] = useState(0);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/cms/login');
      return;
    }

    fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unauthorized');
        return response.json();
      })
      .then((user) => setAuthState(user.role === 'ADMIN' ? 'allowed' : 'forbidden'))
      .catch(() => {
        localStorage.removeItem('cms_token');
        localStorage.removeItem('cms_user');
        router.replace('/cms/login');
      });
  }, [router]);

  const exportBackup = async () => {
    const token = getAuthToken();
    if (!token) return router.replace('/cms/login');

    setExporting(true);
    setTransferredBytes(0);
    const suggestedName = `sportdata-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl.gz`;
    let writable: Awaited<ReturnType<NonNullable<SaveFilePickerWindow['showSaveFilePicker']>>> extends infer Handle
      ? Handle extends { createWritable: () => Promise<infer Writable> } ? Writable : never
      : never;

    try {
      const pickerWindow = window as SaveFilePickerWindow;
      if (pickerWindow.showSaveFilePicker) {
        const handle = await pickerWindow.showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'SportData JSONL Gzip',
            accept: { 'application/gzip': ['.jsonl.gz'] },
          }],
        });
        writable = await handle.createWritable();
      }

      const response = await fetch('/api/system-backup/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await readResponseError(response));

      if (writable && response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writable.write(value);
          setTransferredBytes((current) => current + value.byteLength);
        }
        await writable.close();
      } else {
        const blob = await response.blob();
        setTransferredBytes(blob.size);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = getDownloadFilename(response) || suggestedName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      message.success('Đã xuất backup hệ thống.');
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        if (writable) await writable.abort().catch(() => undefined);
        message.error(error?.message || 'Không thể xuất backup.');
      }
    } finally {
      setExporting(false);
    }
  };

  const importBackup = () => {
    if (!selectedFile) return;
    modal.confirm({
      title: 'Khôi phục toàn bộ dữ liệu?',
      icon: <ShieldAlert className="h-5 w-5 text-red-400" />,
      width: 560,
      content: (
        <div className="space-y-2 pt-2">
          <p>File: <strong>{selectedFile.name}</strong> ({formatBytes(selectedFile.size)})</p>
          <p className="text-red-300">
            Toàn bộ dữ liệu hiện tại sẽ được thay thế bằng nội dung trong file. Hệ thống sẽ kiểm tra
            định dạng, cấu trúc và checksum trước khi thay đổi dữ liệu.
          </p>
        </div>
      ),
      okText: 'Khôi phục dữ liệu',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => performImport(selectedFile),
    });
  };

  const performImport = async (file: File) => {
    const token = getAuthToken();
    if (!token) return router.replace('/cms/login');

    setImporting(true);
    setUploadPercent(0);
    setLastImport(null);
    try {
      const result = await uploadBackup(file, token, setUploadPercent);
      setLastImport(result);
      setSelectedFile(null);
      message.success(`Đã khôi phục ${result.rows.toLocaleString('vi-VN')} bản ghi.`);
    } catch (error: any) {
      message.error(error?.message || 'Không thể nhập backup.');
      throw error;
    } finally {
      setImporting(false);
    }
  };

  if (authState === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-sdark-950">
        <Spin size="large" description="Đang xác thực quyền quản trị" />
      </div>
    );
  }

  if (authState === 'forbidden') {
    return (
      <div className="grid min-h-screen place-items-center bg-sdark-950 p-4">
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle="Trang sao lưu hệ thống chỉ dành cho tài khoản ADMIN."
          extra={<Button type="primary" href="/cms">Về CMS</Button>}
        />
      </div>
    );
  }

  const uploadFileList: UploadFile[] = selectedFile ? [{
    uid: 'selected-backup',
    name: selectedFile.name,
    size: selectedFile.size,
    type: selectedFile.type,
    status: 'done',
    originFileObj: selectedFile as UploadFile['originFileObj'],
  }] : [];

  return (
    <main className="min-h-screen bg-[#070b16] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Flex align="center" justify="space-between" gap={16} wrap className="mb-8">
          <div>
            <Flex align="center" gap={10}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-sblue-500/15 text-sblue-300">
                <DatabaseBackup className="h-6 w-6" />
              </span>
              <div>
                <Typography.Title level={2} className="!mb-0">Sao lưu hệ thống</Typography.Title>
                <Typography.Text type="secondary">Trang quản trị ẩn · chỉ dành cho ADMIN</Typography.Text>
              </div>
            </Flex>
          </div>
          <Button href="/cms" icon={<ArrowLeft className="h-4 w-4" />}>Trở về CMS</Button>
        </Flex>

        <Alert
          className="mb-6"
          type="warning"
          showIcon
          message="File backup chứa toàn bộ dữ liệu hệ thống"
          description="Bao gồm tài khoản, mật khẩu đã băm, sự kiện, vận động viên, trận đấu, thống kê và toàn bộ quan hệ dữ liệu. Hãy lưu file ở nơi an toàn."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="cms-surface" title={(
            <Flex align="center" gap={8}><Download className="h-5 w-5 text-sblue-300" /> Xuất backup</Flex>
          )}>
            <div className="space-y-5">
              <div className="rounded-xl border border-sdark-700 bg-sdark-950/45 p-4">
                <Flex align="center" justify="space-between" gap={12}>
                  <div>
                    <Typography.Text strong className="block">Một file duy nhất</Typography.Text>
                    <Typography.Text type="secondary" className="text-xs">JSON Lines nén bằng Gzip</Typography.Text>
                  </div>
                  <Tag color="blue">.jsonl.gz</Tag>
                </Flex>
              </div>
              <Typography.Paragraph type="secondary">
                Dữ liệu được đọc và nén theo luồng. Trên Chrome/Edge, file được ghi thẳng xuống ổ đĩa,
                phù hợp với backup dung lượng lớn.
              </Typography.Paragraph>
              {exporting && (
                <div>
                  <Flex justify="space-between">
                    <Typography.Text type="secondary">Đang xuất dữ liệu…</Typography.Text>
                    <Typography.Text>{formatBytes(transferredBytes)}</Typography.Text>
                  </Flex>
                  <Progress percent={100} status="active" showInfo={false} />
                </div>
              )}
              <Button
                type="primary"
                size="large"
                block
                loading={exporting}
                icon={<FileArchive className="h-4 w-4" />}
                onClick={exportBackup}
              >
                Xuất file backup
              </Button>
            </div>
          </Card>

          <Card className="cms-surface" title={(
            <Flex align="center" gap={8}><HardDriveUpload className="h-5 w-5 text-emerald-300" /> Nhập backup</Flex>
          )}>
            <div className="space-y-5">
              <Upload.Dragger
                accept=".jsonl.gz,application/gzip"
                maxCount={1}
                fileList={uploadFileList}
                disabled={importing}
                beforeUpload={(file) => {
                  if (!file.name.toLowerCase().endsWith('.jsonl.gz')) {
                    message.error('Chỉ chấp nhận file .jsonl.gz');
                    return Upload.LIST_IGNORE;
                  }
                  if (file.size > MAX_BACKUP_FILE_SIZE) {
                    message.error('File backup vượt quá giới hạn 2GB');
                    return Upload.LIST_IGNORE;
                  }
                  setSelectedFile(file);
                  setLastImport(null);
                  return false;
                }}
                onRemove={() => {
                  setSelectedFile(null);
                  return true;
                }}
              >
                <p className="ant-upload-drag-icon"><FileArchive className="mx-auto h-9 w-9 text-sblue-400" /></p>
                <p className="ant-upload-text">Chọn hoặc kéo file backup vào đây</p>
                <p className="ant-upload-hint">Định dạng .jsonl.gz · tối đa 2GB</p>
              </Upload.Dragger>

              {importing && (
                <div>
                  <Flex justify="space-between">
                    <Typography.Text type="secondary">Đang tải lên và khôi phục…</Typography.Text>
                    <Typography.Text>{uploadPercent}%</Typography.Text>
                  </Flex>
                  <Progress percent={uploadPercent} status="active" />
                </div>
              )}

              <Button
                danger
                type="primary"
                size="large"
                block
                disabled={!selectedFile}
                loading={importing}
                icon={<DatabaseBackup className="h-4 w-4" />}
                onClick={importBackup}
              >
                Kiểm tra và khôi phục
              </Button>
            </div>
          </Card>
        </div>

        {lastImport && (
          <Alert
            className="mt-6"
            type="success"
            showIcon
            message="Khôi phục hoàn tất"
            description={`${lastImport.rows.toLocaleString('vi-VN')} bản ghi từ ${Object.keys(lastImport.tables).length} bảng · Backup tạo lúc ${new Date(lastImport.createdAt).toLocaleString('vi-VN')}`}
          />
        )}

        <Flex align="center" gap={8} className="mt-6 text-slate-500">
          <LockKeyhole className="h-4 w-4" />
          <Typography.Text type="secondary" className="text-xs">
            File được kiểm tra hai lượt; việc khôi phục chạy trong transaction và tự hoàn tác nếu có lỗi.
          </Typography.Text>
        </Flex>
      </div>
    </main>
  );
}

async function uploadBackup(file: File, token: string, onProgress: (percent: number) => void) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const createResponse = await fetch('/api/system-backup/import/uploads', {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename: file.name, size: file.size }),
  });
  if (!createResponse.ok) throw new Error(await readResponseError(createResponse));
  const session = await createResponse.json() as { uploadId: string; chunkSize: number };

  try {
    let index = 0;
    for (let offset = 0; offset < file.size; offset += session.chunkSize) {
      const chunk = file.slice(offset, Math.min(offset + session.chunkSize, file.size));
      await uploadBackupChunk(session.uploadId, index, chunk, token, (loaded) => {
        const uploaded = Math.min(file.size, offset + loaded);
        onProgress(Math.min(95, Math.round((uploaded / file.size) * 95)));
      });
      index += 1;
    }

    onProgress(96);
    const completeResponse = await fetch(
      `/api/system-backup/import/uploads/${encodeURIComponent(session.uploadId)}/complete`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!completeResponse.ok) throw new Error(await readResponseError(completeResponse));
    onProgress(100);
    return await completeResponse.json() as ImportResult;
  } catch (error) {
    await fetch(`/api/system-backup/import/uploads/${encodeURIComponent(session.uploadId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
    throw error;
  }
}

async function uploadBackupChunk(
  uploadId: string,
  index: number,
  chunk: Blob,
  token: string,
  onProgress: (loaded: number) => void,
) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await sendBackupChunk(uploadId, index, chunk, token, onProgress);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Không thể tải chunk backup');
      if (attempt < 3) await new Promise((resolve) => window.setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

function sendBackupChunk(
  uploadId: string,
  index: number,
  chunk: Blob,
  token: string,
  onProgress: (loaded: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      'POST',
      `/api/system-backup/import/uploads/${encodeURIComponent(uploadId)}/chunks/${index}`,
    );
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.setRequestHeader('Content-Type', 'application/octet-stream');
    request.upload.onprogress = (event) => onProgress(event.loaded);
    request.onerror = () => reject(new Error('Mất kết nối khi tải file backup.'));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      let message = `Không thể tải chunk backup (HTTP ${request.status})`;
      try {
        const payload = request.responseText ? JSON.parse(request.responseText) : null;
        const responseMessage = payload?.message;
        if (responseMessage) message = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage;
      } catch {
        // Keep the HTTP status message for non-JSON proxy errors.
      }
      reject(new Error(message));
    };
    request.send(chunk);
  });
}

async function readResponseError(response: Response) {
  try {
    const payload = await response.json();
    const message = payload?.message || `HTTP ${response.status}`;
    return Array.isArray(message) ? message.join(', ') : message;
  } catch {
    return `Không thể xuất backup (HTTP ${response.status})`;
  }
}

function getDownloadFilename(response: Response) {
  const disposition = response.headers.get('content-disposition') || '';
  return disposition.match(/filename="?([^";]+)"?/i)?.[1];
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
