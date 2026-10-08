'use client';

import { imageUrl as optimizedImageUrl } from '@/lib/image-url';

import { useRef, useState } from 'react';
import { Button, Input, Modal, Segmented, Tooltip } from 'antd';
import {
  Bold,
  Eye,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  PencilLine,
  Quote,
} from 'lucide-react';
import { RichTextContent } from '@/components/RichTextContent';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export function MarkdownEditor({ value, onChange, onBlur, error }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageSelectionRef = useRef({ start: 0, end: 0 });
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageError, setImageError] = useState('');

  const replaceSelection = (before: string, after = '', placeholder = 'nội dung') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const prefixLines = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndIndex = value.indexOf('\n', end);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const selected = value.slice(lineStart, lineEnd) || 'Nội dung';
    const replacement = selected.split('\n').map((line) => `${prefix}${line}`).join('\n');
    onChange(`${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`);
    requestAnimationFrame(() => textarea.focus());
  };

  const openImageModal = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    imageSelectionRef.current = { start, end };
    setImageAlt(value.slice(start, end));
    setImageUrl('');
    setImageError('');
    setImageModalOpen(true);
  };

  const insertImage = () => {
    const normalizedUrl = imageUrl.trim();
    try {
      const parsedUrl = new URL(normalizedUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      setImageError('Vui lòng nhập URL ảnh bắt đầu bằng http:// hoặc https://');
      return;
    }

    const { start, end } = imageSelectionRef.current;
    const safeAlt = imageAlt.trim().replace(/[\[\]]/g, '') || 'Ảnh bài viết';
    const imageMarkdown = `\n\n![${safeAlt}](${normalizedUrl})\n\n`;
    const nextValue = `${value.slice(0, start)}${imageMarkdown}${value.slice(end)}`;
    onChange(nextValue);
    setMode('write');
    setImageModalOpen(false);
    requestAnimationFrame(() => {
      const caret = start + imageMarkdown.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  };

  const tools = [
    { label: 'Tiêu đề', icon: Heading2, action: () => prefixLines('## ') },
    { label: 'In đậm', icon: Bold, action: () => replaceSelection('**', '**') },
    { label: 'In nghiêng', icon: Italic, action: () => replaceSelection('_', '_') },
    { label: 'Liên kết', icon: Link2, action: () => replaceSelection('[', '](https://)', 'tên liên kết') },
    { label: 'Chèn ảnh', icon: ImagePlus, action: openImageModal },
    { label: 'Danh sách', icon: List, action: () => prefixLines('- ') },
    { label: 'Danh sách số', icon: ListOrdered, action: () => prefixLines('1. ') },
    { label: 'Trích dẫn', icon: Quote, action: () => prefixLines('> ') },
  ];

  return (
    <div className={`markdown-editor ${error ? 'is-error' : ''}`}>
      <div className="markdown-editor-toolbar">
        <div className="flex flex-wrap items-center gap-1">
          {tools.map(({ label, icon: Icon, action }) => (
            <Tooltip title={label} key={label}>
              <Button type="text" aria-label={label} icon={<Icon className="h-4 w-4" />} onClick={action} />
            </Tooltip>
          ))}
        </div>
        <Segmented
          size="small"
          value={mode}
          onChange={(nextMode) => setMode(nextMode as 'write' | 'preview')}
          options={[
            { value: 'write', label: <span className="inline-flex items-center gap-1"><PencilLine className="h-3.5 w-3.5" /> Viết</span> },
            { value: 'preview', label: <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Xem trước</span> },
          ]}
        />
      </div>
      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="markdown-editor-input"
          placeholder="Viết nội dung bài viết tại đây..."
          aria-label="Nội dung bài viết"
        />
      ) : (
        <div className="markdown-editor-preview">
          {value.trim()
            ? <RichTextContent content={value} />
            : <p className="text-sm text-slate-500">Chưa có nội dung để xem trước.</p>}
        </div>
      )}
      <div className="markdown-editor-footer">
        <span>{error || 'Hỗ trợ tiêu đề, định dạng chữ, liên kết, hình ảnh, danh sách và trích dẫn.'}</span>
        <span>{value.trim() ? value.trim().split(/\s+/).length : 0} từ</span>
      </div>

      <Modal
        open={imageModalOpen}
        title="Chèn ảnh vào bài viết"
        okText="Chèn ảnh"
        cancelText="Hủy"
        onOk={insertImage}
        onCancel={() => setImageModalOpen(false)}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">URL hình ảnh</label>
            <Input
              autoFocus
              type="url"
              value={imageUrl}
              status={imageError ? 'error' : undefined}
              placeholder="https://example.com/hinh-anh.jpg"
              onChange={(event) => {
                setImageUrl(event.target.value);
                setImageError('');
              }}
              onPressEnter={insertImage}
            />
            {imageError && <p className="mt-1.5 text-xs text-red-500">{imageError}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Mô tả ảnh</label>
            <Input
              value={imageAlt}
              maxLength={180}
              placeholder="Mô tả ngắn giúp người đọc hiểu nội dung ảnh"
              onChange={(event) => setImageAlt(event.target.value)}
              onPressEnter={insertImage}
            />
          </div>
          {imageUrl.trim() && !imageError && (
            <div className="markdown-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optimizedImageUrl(imageUrl.trim(), 'card')} alt={imageAlt.trim() || 'Xem trước ảnh bài viết'} />
            </div>
          )}
          <p className="text-xs leading-5 text-slate-500">
            Nên dùng ảnh HTTPS, chiều ngang tối thiểu 1.200px để hiển thị sắc nét.
          </p>
        </div>
      </Modal>
    </div>
  );
}
