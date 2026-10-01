'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Select, Spin } from 'antd';
import { Camera, Check, RefreshCw, RotateCcw } from 'lucide-react';

type FacingMode = 'user' | 'environment';

type CameraCaptureButtonProps = {
  onCapture: (file: File) => void | Promise<void>;
  facingMode?: FacingMode;
  disabled?: boolean;
  label?: string;
};

type CapturedPhoto = {
  file: File;
  url: string;
};

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Quyền dùng camera đang bị chặn. Hãy cho phép camera trong cài đặt của trình duyệt rồi thử lại.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'Không tìm thấy camera trên thiết bị này.';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động.';
    }
    if (error.name === 'OverconstrainedError') {
      return 'Camera đã chọn không còn khả dụng. Hãy chọn camera khác.';
    }
  }

  return 'Không thể kết nối camera. Camera trên trình duyệt cần HTTPS hoặc địa chỉ localhost.';
}

export function CameraCaptureButton({
  onCapture,
  facingMode = 'environment',
  disabled,
  label = 'Máy ảnh',
}: CameraCaptureButtonProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>();
  const [photo, setPhoto] = useState<CapturedPhoto>();

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  }, []);

  const clearPhoto = useCallback(() => {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return undefined;
    });
  }, []);

  const startCamera = useCallback(async (requestedDeviceId?: string) => {
    stopCamera();
    setError('');
    setStarting(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Camera API is unavailable', 'NotSupportedError');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: requestedDeviceId
          ? { deviceId: { exact: requestedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const availableDevices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'videoinput');
      setDevices(availableDevices);
      const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (activeDeviceId) setDeviceId(activeDeviceId);
      setReady(true);
    } catch (cameraError) {
      stopCamera();
      setError(cameraErrorMessage(cameraError));
    } finally {
      setStarting(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (open && !photo) void startCamera();
    return () => stopCamera();
  }, [open, photo, startCamera, stopCamera]);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const close = () => {
    stopCamera();
    clearPhoto();
    setError('');
    setOpen(false);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError('Camera chưa sẵn sàng. Hãy đợi một chút rồi chụp lại.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Không thể tạo ảnh từ camera. Hãy thử lại.');
        return;
      }

      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhoto({ file, url: URL.createObjectURL(blob) });
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const retake = () => {
    clearPhoto();
  };

  const confirmPhoto = async () => {
    if (!photo) return;
    setSaving(true);
    try {
      await onCapture(photo.file);
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        disabled={disabled}
        icon={<Camera className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Modal
        open={open}
        title="Chụp ảnh từ camera"
        width={760}
        footer={null}
        destroyOnHidden
        maskClosable={false}
        onCancel={close}
      >
        <div className="space-y-4">
          {error && <Alert showIcon type="error" message={error} />}

          {devices.length > 1 && !photo && (
            <Select
              className="w-full"
              value={deviceId}
              aria-label="Chọn camera"
              options={devices.map((device, index) => ({
                value: device.deviceId,
                label: device.label || `Camera ${index + 1}`,
              }))}
              onChange={(value) => {
                setDeviceId(value);
                void startCamera(value);
              }}
            />
          )}

          <div className="relative grid min-h-80 place-items-center overflow-hidden rounded-xl bg-black">
            {starting && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-black/60">
                <Spin size="large" />
              </div>
            )}
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt="Ảnh vừa chụp" className="max-h-[62vh] w-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="max-h-[62vh] w-full object-contain"
                aria-label="Hình ảnh trực tiếp từ camera"
              />
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {!photo ? (
              <>
                {error && (
                  <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void startCamera(deviceId)}>
                    Kết nối lại
                  </Button>
                )}
                <Button type="primary" icon={<Camera className="h-4 w-4" />} disabled={!ready} onClick={takePhoto}>
                  Chụp ảnh
                </Button>
              </>
            ) : (
              <>
                <Button icon={<RotateCcw className="h-4 w-4" />} disabled={saving} onClick={retake}>
                  Chụp lại
                </Button>
                <Button type="primary" icon={<Check className="h-4 w-4" />} loading={saving} onClick={() => void confirmPhoto()}>
                  Dùng ảnh này
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
