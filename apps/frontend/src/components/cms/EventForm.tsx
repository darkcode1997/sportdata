'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Card, Checkbox, Col, DatePicker, Form, Input, Row, Select } from 'antd';
import { api, fetcher } from '@/lib/api';
import { ErrorMessage, FormActions } from './AthleteForm';
import { RemoteAthleteSelect } from './RemoteAthleteSelect';

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
  const [athleteCountryId, setAthleteCountryId] = useState<string>();
  const { data: sports = [] } = useSWR<any[]>('/sports', fetcher);
  const { data: categoriesResponse } = useSWR<any>('/categories?limit=500', fetcher);
  const categories = categoriesResponse?.items || [];
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
  const selectedCategoryIdsKey = selectedCategoryIds.join(',');
  const { data: athleteFilterOptions } = useSWR<any>(
    selectedCategoryIdsKey
      ? `/athletes/filter-options?categoryIds=${encodeURIComponent(selectedCategoryIdsKey)}`
      : null,
    fetcher,
  );
  const countries = athleteFilterOptions?.countries || [];
  const availableCategories = categories.filter((category: any) => selectedSportIds.includes(category.sportId));
  const selectedSports = selectedSportIds
    .map((sportId) => sports.find((sport: any) => sport.id === sportId))
    .filter(Boolean);

  useEffect(() => {
    if (athleteCountryId && !countries.some((country: any) => country.id === athleteCountryId)) {
      setAthleteCountryId(undefined);
    }
  }, [athleteCountryId, countries]);

  const onSubmit = async (values: EventFormValues) => {
    setSubmitError(null);
    const validCategoryIds = values.categoryIds.filter(
      (id) => availableCategories.some((category: any) => category.id === id),
    );
    const payload = {
      ...values,
      sportId: values.sportIds[0],
      categoryIds: validCategoryIds,
      athleteIds: values.athleteIds,
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
                maxTagCount={3}
                maxTagTextLength={24}
                maxTagPlaceholder={() => `Đã chọn ${field.value.length} bộ môn`}
                placeholder="Chọn một hoặc nhiều bộ môn"
                value={field.value}
                onChange={(sportIds: string[]) => {
                  field.onChange(sportIds);
                  const allowedSportIds = new Set(sportIds);
                  const validCategoryIds = selectedCategoryIds.filter((categoryId) => {
                    const category = categories.find((item: any) => item.id === categoryId);
                    return category && allowedSportIds.has(category.sportId);
                  });
                  setValue('categoryIds', validCategoryIds, { shouldValidate: true });
                  setValue('athleteIds', [], { shouldValidate: true });
                }}
                options={sports.map((sport) => ({ value: sport.id, label: sport.name }))}
              />
            )}
          </ControlledField>
          <ControlledField name="categoryIds" control={control} label="Hạng mục thi đấu" error={errors.categoryIds?.message} wide>
            {(field) => (
              <CategoryGroupedSelect
                sports={selectedSports}
                categories={availableCategories}
                value={field.value}
                onChange={(categoryIds: string[]) => {
                  field.onChange(categoryIds);
                  setValue('athleteIds', [], { shouldValidate: true });
                }}
              />
            )}
          </ControlledField>
          <ControlledField name="athleteIds" control={control} label="Vận động viên tham gia" error={errors.athleteIds?.message} wide>
            {(field) => (
              <div className="rounded-xl border border-sdark-700 bg-sdark-950/35 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    Lọc danh sách theo quốc gia
                  </span>
                  <span className="rounded-full bg-sblue-500/10 px-2.5 py-1 text-xs font-bold text-sblue-300">
                    Đã chọn {(field.value || []).length.toLocaleString()} VĐV
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    size="large"
                    placeholder="Tất cả quốc gia"
                    value={athleteCountryId}
                    onChange={setAthleteCountryId}
                    options={countries.map((country: any) => ({
                      value: country.id,
                      label: `${country.name} · ${country.code} (${country.athleteCount})`,
                    }))}
                  />
                  <RemoteAthleteSelect
                    mode="multiple"
                    categoryIds={selectedCategoryIds}
                    countryId={athleteCountryId}
                    groupByCountry
                    maxTagCount={0}
                    selectionLabel="VĐV"
                    showPageControls
                    placeholder={selectedCategoryIds.length
                      ? 'Tìm và chọn vận động viên đủ điều kiện'
                      : 'Chọn hạng mục thi đấu trước'}
                    disabled={!selectedCategoryIds.length}
                    value={field.value || []}
                    onChange={field.onChange}
                  />
                </div>
              </div>
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

function CategoryGroupedSelect({
  sports,
  categories,
  value = [],
  onChange,
}: {
  sports: any[];
  categories: any[];
  value?: string[];
  onChange: (value: string[]) => void;
}) {
  if (!sports.length) {
    return (
      <Select
        disabled
        size="large"
        className="w-full"
        placeholder="Chọn bộ môn trước"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {sports.map((sport) => {
        const sportCategories = categories.filter((category) => category.sportId === sport.id);
        const sportCategoryIds = new Set(sportCategories.map((category) => category.id));
        const selectedIds = value.filter((categoryId) => sportCategoryIds.has(categoryId));
        const replaceSportSelection = (nextIds: string[]) => {
          onChange([
            ...value.filter((categoryId) => !sportCategoryIds.has(categoryId)),
            ...nextIds,
          ]);
        };

        return (
          <div
            key={sport.id}
            className="rounded-xl border border-sdark-700 bg-sdark-950/35 p-3"
          >
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <strong className="min-w-0 flex-1 truncate text-sm text-slate-200">
                {sport.name}
              </strong>
              <span className="text-xs tabular-nums text-slate-500">
                {selectedIds.length}/{sportCategories.length}
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-sky-400 disabled:text-slate-600"
                disabled={!sportCategories.length}
                onClick={() => replaceSportSelection(
                  selectedIds.length === sportCategories.length
                    ? []
                    : sportCategories.map((category) => category.id),
                )}
              >
                {selectedIds.length === sportCategories.length ? 'Bỏ chọn' : 'Chọn tất cả'}
              </button>
            </div>
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              size="large"
              className="w-full"
              maxTagCount={1}
              maxTagTextLength={28}
              maxTagPlaceholder={() => `+${Math.max(0, selectedIds.length - 1)} hạng mục`}
              placeholder={sportCategories.length ? 'Chọn hạng mục' : 'Chưa có hạng mục'}
              disabled={!sportCategories.length}
              value={selectedIds}
              onChange={replaceSportSelection}
              options={sportCategories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </div>
        );
      })}
    </div>
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
