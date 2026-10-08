'use client';

import { useEffect, useState } from 'react';
import { Image } from 'antd';
import type { ImageProps } from 'antd';
import type { AxiosInstance } from 'axios';
import { api } from '@/lib/api';

type ProtectedImageProps = ImageProps & { endpoint: string; client?: AxiosInstance };

/** The thumbnail is a blob; request a larger authorized image only when opening preview. */
export function ProtectedImage({ endpoint, client = api, preview, src, alt = '', ...props }: ProtectedImageProps) {
  const [open, setOpen] = useState(false);
  const [fullImage, setFullImage] = useState<{ source?: string; url: string }>();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void client.get(endpoint, { responseType: 'blob', params: { variant: 'preview' }, signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(response.data);
        setFullImage({ source: src, url: objectUrl });
      })
      .catch(() => { /* Keep the thumbnail available if the larger request fails. */ });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, endpoint, client, src]);

  const previewOptions = typeof preview === 'object' ? preview : {};
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      preview={preview === false ? false : {
        ...previewOptions,
        open,
        src: open && fullImage?.source === src ? fullImage.url : src,
        onOpenChange: (value) => {
          setFullImage(undefined);
          setOpen(value);
          previewOptions.onOpenChange?.(value);
        },
      }}
    />
  );
}
