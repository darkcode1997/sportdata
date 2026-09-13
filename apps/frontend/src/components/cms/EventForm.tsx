'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Card, Checkbox, Col, DatePicker, Form, Input, Row, Select } from 'antd';
import { api, fetcher } from '@/lib/api';
import { ErrorMessage, FormActions } from './AthleteForm';

const eventSchema = z.object({
  name: z.string().min(3, 'Tên sự kiện phải có ít nhất 3 ký tự'),
  sportIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất một bộ môn'),
  categoryIds: z.array(z.string()),
  athleteIds: z.array(z.string()),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Vui lòng chọn thời gian bắt đầu'),
  endDate: z.string().min(1, 'Vui lòng chọn thời gian kết thúc'),
  location: z.string().optional(),
  bannerUrl: z.string().url('URL banner không hợp lệ').or(z.literal('')).optional(),
  logoUrl: z.string().url('URL logo không hợp lệ').or(z.literal('')).optional(),
  isPublished: z.boolean(),
}).refine((values) => new Date(values.endDate) >= new Date(values.startDate), {
  message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
  path: ['endDate'],
});

type EventFormValues = z.infer<typeof eventSchema>;
const toLocalInput = (value?: string) => value ? dayjs(value).format('YYYY-MM-DDTHH:mm') : '';

export function EventForm({ eventId, initialData }: { eventId?: string; initialData?: any }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: sports = [] } = useSWR<any[]>('/sports', fetcher);
  const { data: categoriesResponse } = useSWR<any>('/categories?limit=500', fetcher);
  const { data: athletesResponse } = useSWR<any>('/athletes?limit=5000', fetcher);
  const categories = categoriesResponse?.items || [];
  const athletes = athletesResponse?.items || [];
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: initialData?.name || '',
      sportIds: initialData?.sports?.map((sport: any) => sport.id) || (initialData?.sportId ? [initialData.sportId] : []),
      categoryIds: initialData?.categories?.map((category: any) => category.id) || [],
      athleteIds: initialData?.athletes?.map((athlete: any) => athlete.id) || [],
      description: initialData?.description || '',
      startDate: toLocalInput(initialData?.startDate),
      endDate: toLocalInput(initialData?.endDate),
      location: initialData?.location || '',
      bannerUrl: initialData?.bannerUrl || '',
      logoUrl: initialData?.logoUrl || '',
      isPublished: initialData?.isPublished ?? false,
    },
  });
  const selectedSportIds = watch('sportIds') || [];
  const selectedCategoryIds = watch('categoryIds') || [];
  const selectedAthleteIds = watch('athleteIds') || [];
  const availableCategories = categories.filter((category: any) => selectedSportIds.includes(category.sportId));
  const getEligibleAthletes = (categoryIds: string[]) => {
    const selectedIds = new Set(categoryIds);
    return athletes.filter((athlete: any) => (
      (athlete.categories || []).some((category: any) => selectedIds.has(category.id))
    ));
  };
  const eligibleAthletes = getEligibleAthletes(selectedCategoryIds);
  const eligibleAthleteIds = new Set(eligibleAthletes.map((athlete: any) => athlete.id));

  const onSubmit = async (values: EventFormValues) => {
    setSubmitError(null);
    const validCategoryIds = values.categoryIds.filter(
      (id) => availableCategories.some((category: any) => category.id === id),
    );
    const validAthleteIds = new Set(
      getEligibleAthletes(validCategoryIds).map((athlete: any) => athlete.id),
    );
    const payload = {
      ...values,
      sportId: values.sportIds[0],
      categoryIds: validCategoryIds,
      athleteIds: values.athleteIds.filter((id) => validAthleteIds.has(id)),
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      description: values.description || undefined,
      location: values.location || undefined,
      bannerUrl: values.bannerUrl || undefined,
      logoUrl: values.logoUrl || undefined,
    };
    try {
      if (eventId) await api.patch(`/events/${eventId}`, payload);
      else await api.post('/events', payload);
      router.push('/cms/events');
      router.refresh();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Không thể lưu sự kiện';
      setSubmitError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  return (
    <Form layout="vertical" requiredMark={false} onFinish={handleSubmit(onSubmit)}>
      {submitError && <ErrorMessage message={submitError} />}
      <Card className="cms-surface" title="Thông tin sự kiện">
        <Row gutter={[20, 2]}>
          <ControlledField name="name" control={control} label="Tên sự kiện" error={errors.name?.message} wide>
            {(field) => <Input {...field} size="large" placeholder="Tên giải đấu hoặc sự kiện" />}
          </ControlledField>
          <ControlledField name="sportIds" control={control} label="Bộ môn" error={errors.sportIds?.message} wide>
            {(field) => (
              <Select
                mode="multiple"
                size="large"
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder="Chọn một hoặc nhiều bộ môn"
                value={field.value}
                onChange={(sportIds: string[]) => {
                  field.onChange(sportIds);
                  const allowedSportIds = new Set(sportIds);
                  const validCategoryIds = selectedCategoryIds.filter((categoryId) => {
                    const category = categories.find((item: any) => item.id === categoryId);
                    return category && allowedSportIds.has(category.sportId);
                  });
                  const validAthleteIds = new Set(
                    getEligibleAthletes(validCategoryIds).map((athlete: any) => athlete.id),
                  );
                  setValue('categoryIds', validCategoryIds, { shouldValidate: true });
                  setValue(
                    'athleteIds',
                    selectedAthleteIds.filter((athleteId) => validAthleteIds.has(athleteId)),
                    { shouldValidate: true },
                  );
                }}
                options={sports.map((sport) => ({ value: sport.id, label: sport.name }))}
              />
            )}
          </ControlledField>
          <ControlledField name="categoryIds" control={control} label="Hạng mục thi đấu" error={errors.categoryIds?.message} wide>
            {(field) => (
              <Select
                mode="multiple"
                size="large"
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={selectedSportIds.length ? 'Chọn các hạng mục của sự kiện' : 'Chọn bộ môn trước'}
                disabled={!selectedSportIds.length}
                value={field.value}
                onChange={(categoryIds: string[]) => {
                  field.onChange(categoryIds);
                  const validAthleteIds = new Set(
                    getEligibleAthletes(categoryIds).map((athlete: any) => athlete.id),
                  );
                  setValue(
                    'athleteIds',
                    selectedAthleteIds.filter((athleteId) => validAthleteIds.has(athleteId)),
                    { shouldValidate: true },
                  );
                }}
                options={availableCategories.map((category: any) => ({
                  value: category.id,
                  label: `${category.name} · ${category.sport?.name || ''}`,
                }))}
              />
            )}
          </ControlledField>
          <ControlledField name="athleteIds" control={control} label="Vận động viên tham gia" error={errors.athleteIds?.message} wide>
            {(field) => (
              <Select
                mode="multiple"
                size="large"
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={selectedCategoryIds.length
                  ? 'Chọn vận động viên đủ điều kiện'
                  : 'Chọn hạng mục thi đấu trước'}
                disabled={!selectedCategoryIds.length}
                value={(field.value || []).filter((athleteId: string) => eligibleAthleteIds.has(athleteId))}
                onChange={field.onChange}
                options={eligibleAthletes.map((athlete: any) => ({
                  value: athlete.id,
                  label: athlete.fullName,
                }))}
                notFoundContent="Không có vận động viên nào đã đăng ký các hạng mục này"
              />
            )}
          </ControlledField>
          <ControlledField name="location" control={control} label="Địa điểm" error={errors.location?.message}>
            {(field) => <Input {...field} size="large" placeholder="Nhà thi đấu, thành phố" />}
          </ControlledField>
          <ControlledField name="startDate" control={control} label="Bắt đầu" error={errors.startDate?.message}>
            {(field) => (
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                size="large"
                className="w-full"
                placeholder="Chọn thời gian bắt đầu"
                value={field.value ? dayjs(field.value) : null}
                onBlur={field.onBlur}
                onChange={(value) => field.onChange(value ? value.format('YYYY-MM-DDTHH:mm') : '')}
              />
            )}
          </ControlledField>
          <ControlledField name="endDate" control={control} label="Kết thúc" error={errors.endDate?.message}>
            {(field) => (
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                size="large"
                className="w-full"
                placeholder="Chọn thời gian kết thúc"
                value={field.value ? dayjs(field.value) : null}
                onBlur={field.onBlur}
                onChange={(value) => field.onChange(value ? value.format('YYYY-MM-DDTHH:mm') : '')}
              />
            )}
          </ControlledField>
          <ControlledField name="bannerUrl" control={control} label="URL banner" error={errors.bannerUrl?.message}>
            {(field) => <Input {...field} size="large" type="url" placeholder="https://..." />}
          </ControlledField>
          <ControlledField name="logoUrl" control={control} label="URL logo" error={errors.logoUrl?.message}>
            {(field) => <Input {...field} size="large" type="url" placeholder="https://..." />}
          </ControlledField>
          <ControlledField name="description" control={control} label="Mô tả" error={errors.description?.message} wide>
            {(field) => <Input.TextArea {...field} rows={5} placeholder="Thông tin giới thiệu sự kiện" />}
          </ControlledField>
          <Col span={24}>
            <Form.Item className="mb-0">
              <Controller
                name="isPublished"
                control={control}
                render={({ field }) => (
                  <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>
                    Công khai sự kiện trên trang người dùng
                  </Checkbox>
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
      <FormActions pending={isSubmitting} label={eventId ? 'Lưu thay đổi' : 'Tạo sự kiện'} cancelHref="/cms/events" />
    </Form>
  );
}

function ControlledField({ name, control, label, error, children, wide = false }: { name: keyof EventFormValues; control: any; label: string; error?: string; children: (field: any) => React.ReactElement; wide?: boolean }) {
  return (
    <Col xs={24} md={wide ? 24 : 12}>
      <Form.Item label={label} validateStatus={error ? 'error' : undefined} help={error} required>
        <Controller name={name} control={control} render={({ field }) => children(field)} />
      </Form.Item>
    </Col>
  );
}
