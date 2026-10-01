'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, Checkbox, Col, Form, Input, Row } from 'antd';
import { Star } from 'lucide-react';
import { api } from '@/lib/api';
import { FormActions } from './AthleteForm';
import { MarkdownEditor } from './MarkdownEditor';
import { useSportDataToast } from '@/hooks/useSportDataToast';

const articleSchema = z.object({
  title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự').max(180, 'Tiêu đề tối đa 180 ký tự'),
  slug: z.string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang')
    .or(z.literal('')),
  excerpt: z.string().max(500, 'Mô tả ngắn tối đa 500 ký tự'),
  coverImageUrl: z.string().url('URL ảnh không hợp lệ').or(z.literal('')),
  content: z.string().min(10, 'Nội dung phải có ít nhất 10 ký tự').max(100_000),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

export function ArticleForm({ articleId, initialData }: { articleId?: string; initialData?: any }) {
  const router = useRouter();
  const toast = useSportDataToast();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      excerpt: initialData?.excerpt || '',
      coverImageUrl: initialData?.coverImageUrl || '',
      content: initialData?.content || '',
      isPublished: initialData?.isPublished ?? false,
      isFeatured: initialData?.isFeatured ?? false,
    },
  });

  const onSubmit = async (values: ArticleFormValues) => {
    const payload = {
      ...values,
      slug: values.slug || undefined,
      excerpt: values.excerpt || undefined,
      coverImageUrl: values.coverImageUrl || undefined,
    };

    try {
      if (articleId) await api.patch(`/articles/${articleId}`, payload);
      else await api.post('/articles', payload);
      toast.success(articleId ? 'Đã cập nhật bài viết.' : 'Đã tạo bài viết.');
      router.push('/cms/news');
      router.refresh();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Không thể lưu bài viết';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  return (
    <Form layout="vertical" requiredMark={false} onFinish={handleSubmit(onSubmit)}>
      <Card className="cms-surface" title="Nội dung bài viết">
        <Row gutter={[20, 2]}>
          <Col xs={24} lg={16}>
            <FormField label="Tiêu đề" error={errors.title?.message} required>
              <Controller
                name="title"
                control={control}
                render={({ field }) => <Input {...field} size="large" placeholder="Nhập tiêu đề bài viết" />}
              />
            </FormField>
          </Col>
          <Col xs={24} lg={8}>
            <FormField label="Slug URL" error={errors.slug?.message}>
              <Controller
                name="slug"
                control={control}
                render={({ field }) => <Input {...field} size="large" placeholder="Tự tạo nếu bỏ trống" />}
              />
            </FormField>
          </Col>
          <Col span={24}>
            <FormField label="Mô tả ngắn" error={errors.excerpt?.message}>
              <Controller
                name="excerpt"
                control={control}
                render={({ field }) => (
                  <Input.TextArea {...field} rows={3} showCount maxLength={500} placeholder="Nội dung tóm tắt hiển thị trên danh sách tin" />
                )}
              />
            </FormField>
          </Col>
          <Col span={24}>
            <FormField label="URL ảnh đại diện" error={errors.coverImageUrl?.message}>
              <Controller
                name="coverImageUrl"
                control={control}
                render={({ field }) => <Input {...field} size="large" type="url" placeholder="https://..." />}
              />
            </FormField>
          </Col>
          <Col span={24}>
            <FormField label="Nội dung" error={errors.content?.message} required>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <MarkdownEditor value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.content?.message} />
                )}
              />
            </FormField>
          </Col>
          <Col span={24}>
            <Form.Item className="!mb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
                <Controller
                  name="isPublished"
                  control={control}
                  render={({ field }) => (
                    <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>
                      Công khai bài viết trên trang Tin tức
                    </Checkbox>
                  )}
                />
                <Controller
                  name="isFeatured"
                  control={control}
                  render={({ field }) => (
                    <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>
                      <span className="inline-flex items-center gap-1.5">
                        <Star className={`h-4 w-4 ${field.value ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                        Ưu tiên trên trang Tổng quan
                      </span>
                    </Checkbox>
                  )}
                />
              </div>
            </Form.Item>
          </Col>
        </Row>
      </Card>
      <FormActions
        pending={isSubmitting}
        label={articleId ? 'Lưu bài viết' : 'Tạo bài viết'}
        cancelHref="/cms/news"
      />
    </Form>
  );
}

function FormField({
  label,
  error,
  required = false,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Form.Item label={label} required={required} validateStatus={error ? 'error' : undefined} help={error}>
      {children}
    </Form.Item>
  );
}
