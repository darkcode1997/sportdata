'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { api, fetcher } from '@/lib/api';

type CountryOption = {
  id: string;
  code: string;
  name: string;
  flagUrl?: string | null;
};

type FederationOption = {
  id: string;
  name: string;
  countryId: string;
  country?: CountryOption;
};

const athleteSchema = z.object({
  firstName: z.string().min(1, 'Vui lòng nhập họ'),
  lastName: z.string().min(1, 'Vui lòng nhập tên'),
  fullName: z.string().min(3, 'Tên hiển thị phải có ít nhất 3 ký tự'),
  gender: z.enum(['MALE', 'FEMALE', 'MIXED']),
  birthDate: z.string().optional(),
  countryId: z.string().min(1, 'Vui lòng chọn quốc gia'),
  federationId: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  photoUrl: z.string().url('URL ảnh không hợp lệ').or(z.literal('')).optional(),
  sportIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất một bộ môn'),
  categoryIds: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất một hạng thi đấu'),
});

type AthleteFormValues = z.infer<typeof athleteSchema>;

export function AthleteForm({ athleteId, initialData }: { athleteId?: string; initialData?: any }) {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [federationManagerOpen, setFederationManagerOpen] = useState(false);
  const { data: countries = [] } = useSWR<CountryOption[]>('/countries', fetcher);
  const {
    data: federations = [],
    isLoading: federationsLoading,
    mutate: mutateFederations,
  } = useSWR<FederationOption[]>('/federations', fetcher);
  const { data: sports = [] } = useSWR<any[]>('/sports', fetcher);

  const {
    control,
    clearErrors,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AthleteFormValues>({
    resolver: zodResolver(athleteSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      fullName: initialData?.fullName || '',
      gender: initialData?.gender || 'MALE',
      birthDate: initialData?.birthDate ? new Date(initialData.birthDate).toISOString().slice(0, 10) : '',
      countryId: initialData?.countryId || '',
      federationId: initialData?.federationId || '',
      height: initialData?.height != null ? String(initialData.height) : '',
      weight: initialData?.weight != null ? String(initialData.weight) : '',
      photoUrl: initialData?.photoUrl || '',
      sportIds: Array.from(
        new Set(
          (initialData?.categories || [])
            .map((category: any) => category.sportId || category.sport?.id)
            .filter(Boolean),
        ),
      ),
      categoryIds: initialData?.categories?.map((category: any) => category.id) || [],
    },
  });
  const selectedCountryId = watch('countryId');
  const selectedFederationId = watch('federationId');
  const selectedSportIds = watch('sportIds') || [];
  const selectedCategoryIds = watch('categoryIds') || [];

  const selectedSports = sports
    .filter((sport: any) => selectedSportIds.includes(sport.id))
    .map((sport: any) => ({
      ...sport,
      categories: uniqueCategories(sport.categories || []),
    }));
  const availableCategoryIds = new Set(
    selectedSports.flatMap((sport: any) =>
      (sport.categories || []).map((category: any) => category.id),
    ),
  );
  const categoryOptions = selectedSports.map((sport: any) => ({
    label: sport.name,
    options: (sport.categories || []).map((category: any) => ({
      value: category.id,
      label: formatCategoryLabel(category),
    })),
  }));

  const onSubmit = async (values: AthleteFormValues) => {
    setSubmitError(null);
    const selectedCategories = sports
      .flatMap((sport: any) => sport.categories || [])
      .filter((category: any) => values.categoryIds.includes(category.id));
    const categorySportIds = new Set(selectedCategories.map((category: any) => category.sportId));
    const sportWithoutCategory = sports.find(
      (sport: any) => values.sportIds.includes(sport.id) && !categorySportIds.has(sport.id),
    );

    if (sportWithoutCategory) {
      setError('categoryIds', {
        type: 'validate',
        message: `Vui lòng chọn ít nhất một hạng thi đấu của ${sportWithoutCategory.name}`,
      });
      return;
    }

    const { sportIds: _sportIds, ...formValues } = values;
    const payload = {
      ...formValues,
      categoryIds: Array.from(new Set(formValues.categoryIds)),
      birthDate: values.birthDate || undefined,
      federationId: values.federationId || undefined,
      height: values.height ? Number(values.height) : undefined,
      weight: values.weight ? Number(values.weight) : undefined,
      photoUrl: values.photoUrl || undefined,
    };
    try {
      if (athleteId) await api.patch(`/athletes/${athleteId}`, payload);
      else await api.post('/athletes', payload);
      router.push('/cms/athletes');
      router.refresh();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Không thể lưu vận động viên';
      setSubmitError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  return (
    <>
      <Form layout="vertical" requiredMark={false} onFinish={handleSubmit(onSubmit)}>
      {submitError && <ErrorMessage message={submitError} />}
      <Card className="cms-surface" title="Thông tin vận động viên">
        <Row gutter={[20, 2]}>
          <ControlledField name="firstName" control={control} label="Họ" error={errors.firstName?.message}>
            {(field) => <Input {...field} size="large" placeholder="Nguyễn" />}
          </ControlledField>
          <ControlledField name="lastName" control={control} label="Tên" error={errors.lastName?.message}>
            {(field) => <Input {...field} size="large" placeholder="Minh Anh" />}
          </ControlledField>
          <ControlledField name="fullName" control={control} label="Tên hiển thị" error={errors.fullName?.message} wide>
            {(field) => <Input {...field} size="large" placeholder="Ví dụ: Nguyễn Minh Anh" />}
          </ControlledField>
          <ControlledField name="gender" control={control} label="Giới tính" error={errors.gender?.message}>
            {(field) => <Select size="large" className="w-full" value={field.value} onChange={field.onChange} options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'MIXED', label: 'Hỗn hợp' }]} />}
          </ControlledField>
          <ControlledField name="birthDate" control={control} label="Ngày sinh" error={errors.birthDate?.message}>
            {(field) => (
              <DatePicker
                format="DD/MM/YYYY"
                size="large"
                className="w-full"
                placeholder="Chọn ngày sinh"
                value={field.value ? dayjs(field.value) : null}
                disabledDate={(current) => current.isAfter(dayjs(), 'day')}
                onBlur={field.onBlur}
                onChange={(value) => field.onChange(value ? value.format('YYYY-MM-DD') : '')}
              />
            )}
          </ControlledField>
          <ControlledField name="countryId" control={control} label="Quốc gia" error={errors.countryId?.message}>
            {(field) => (
              <Select
                size="large"
                showSearch
                optionFilterProp="searchText"
                className="w-full"
                placeholder="Chọn quốc gia"
                value={field.value || undefined}
                onChange={field.onChange}
                options={countries.map((country) => ({
                  value: country.id,
                  searchText: `${country.code} ${country.name}`,
                  label: <CountryLabel country={country} />,
                }))}
              />
            )}
          </ControlledField>
          <ControlledField
            name="federationId"
            control={control}
            label={(
              <Space size={4}>
                <span>Liên đoàn / đơn vị</span>
                <Tooltip title="Thêm, sửa hoặc xóa liên đoàn">
                  <Button
                    type="text"
                    size="small"
                    htmlType="button"
                    aria-label="Quản lý liên đoàn"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => setFederationManagerOpen(true)}
                  />
                </Tooltip>
              </Space>
            )}
            error={errors.federationId?.message}
          >
            {(field) => <Select size="large" allowClear showSearch optionFilterProp="label" className="w-full" placeholder="Chưa xác định" value={field.value || undefined} onChange={(value) => field.onChange(value || '')} options={federations.map((federation) => ({ value: federation.id, label: federation.name }))} />}
          </ControlledField>
          <ControlledField name="height" control={control} label="Chiều cao (cm)" error={errors.height?.message}>
            {(field) => <Input {...field} size="large" type="number" min={0} step={0.1} placeholder="170" />}
          </ControlledField>
          <ControlledField name="weight" control={control} label="Cân nặng (kg)" error={errors.weight?.message}>
            {(field) => <Input {...field} size="large" type="number" min={0} step={0.1} placeholder="65" />}
          </ControlledField>
          <ControlledField name="photoUrl" control={control} label="URL ảnh đại diện" error={errors.photoUrl?.message} wide>
            {(field) => <Input {...field} size="large" type="url" placeholder="https://..." />}
          </ControlledField>
        </Row>
      </Card>
      <Card className="cms-surface mt-6" title="Nội dung thi đấu">
        <Typography.Paragraph type="secondary" className="mb-5">
          Một vận động viên có thể đăng ký nhiều bộ môn và nhiều hạng thi đấu.
        </Typography.Paragraph>
        <Row gutter={[20, 2]}>
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
                  const nextSportIds = Array.from(new Set<string>(sportIds));
                  setValue('sportIds', nextSportIds, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  const validCategoryIds = new Set(
                    sports
                      .filter((sport: any) => nextSportIds.includes(sport.id))
                      .flatMap((sport: any) =>
                        (sport.categories || []).map((category: any) => category.id),
                      ),
                  );
                  setValue(
                    'categoryIds',
                    selectedCategoryIds.filter((categoryId) => validCategoryIds.has(categoryId)),
                    { shouldDirty: true, shouldTouch: true, shouldValidate: true },
                  );
                }}
                options={sports.map((sport: any) => ({ value: sport.id, label: sport.name }))}
              />
            )}
          </ControlledField>
          <ControlledField name="categoryIds" control={control} label="Hạng cân / hạng thi đấu" error={errors.categoryIds?.message} wide>
            {(field) => (
              <Select
                mode="multiple"
                size="large"
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder={selectedSportIds.length ? 'Chọn một hoặc nhiều hạng thi đấu' : 'Chọn bộ môn trước'}
                disabled={!selectedSportIds.length}
                value={field.value.filter((categoryId: string) => availableCategoryIds.has(categoryId))}
                onChange={(categoryIds: string[]) => {
                  const nextCategoryIds = Array.from(new Set<string>(categoryIds))
                    .filter((categoryId) => availableCategoryIds.has(categoryId));
                  setValue('categoryIds', nextCategoryIds, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  if (nextCategoryIds.length) clearErrors('categoryIds');
                }}
                options={categoryOptions}
                notFoundContent="Bộ môn này chưa có hạng thi đấu"
              />
            )}
          </ControlledField>
        </Row>
      </Card>
      <FormActions pending={isSubmitting} label={athleteId ? 'Lưu thay đổi' : 'Tạo vận động viên'} cancelHref="/cms/athletes" />
      </Form>

      <FederationManager
        open={federationManagerOpen}
        countries={countries}
        federations={federations}
        loading={federationsLoading}
        preferredCountryId={selectedCountryId}
        selectedFederationId={selectedFederationId}
        onClose={() => setFederationManagerOpen(false)}
        onSelect={(federationId) => {
          setValue('federationId', federationId, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }}
        onChanged={() => mutateFederations()}
        canDelete={currentUser?.role === 'ADMIN'}
      />
    </>
  );
}

function CountryLabel({ country }: { country: CountryOption }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {country.flagUrl ? (
        <img
          src={country.flagUrl}
          alt={`Cờ ${country.name}`}
          className="h-4 w-6 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <span className="h-4 w-6 shrink-0 rounded-sm bg-sdark-700" aria-hidden="true" />
      )}
      <span className="truncate">{country.code} · {country.name}</span>
    </span>
  );
}

function FederationManager({
  open,
  countries,
  federations,
  loading,
  preferredCountryId,
  selectedFederationId,
  onClose,
  onSelect,
  onChanged,
  canDelete,
}: {
  open: boolean;
  countries: CountryOption[];
  federations: FederationOption[];
  loading: boolean;
  preferredCountryId?: string;
  selectedFederationId?: string;
  onClose: () => void;
  onSelect: (federationId: string) => void;
  onChanged: () => Promise<unknown>;
  canDelete: boolean;
}) {
  const [countryId, setCountryId] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const selectedFederation = federations.find(
      (federation) => federation.id === selectedFederationId,
    );
    setCountryId(
      selectedFederation?.countryId || preferredCountryId || countries[0]?.id || '',
    );
    setName('');
    setEditingId(null);
    setError(null);
  }, [countries, federations, open, preferredCountryId, selectedFederationId]);

  const visibleFederations = federations.filter(
    (federation) => federation.countryId === countryId,
  );

  const resetEditor = () => {
    setName('');
    setEditingId(null);
  };

  const saveFederation = async () => {
    const normalizedName = name.trim();
    if (!countryId) {
      setError('Vui lòng chọn quốc gia của liên đoàn.');
      return;
    }
    if (!normalizedName) {
      setError('Vui lòng nhập tên liên đoàn.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = editingId
        ? await api.patch<FederationOption>(`/federations/${editingId}`, {
            name: normalizedName,
            countryId,
          })
        : await api.post<FederationOption>('/federations', {
            name: normalizedName,
            countryId,
          });
      await onChanged();
      onSelect(response.data.id);
      resetEditor();
    } catch (requestError: any) {
      setError(getRequestError(requestError, 'Không thể lưu liên đoàn.'));
    } finally {
      setSaving(false);
    }
  };

  const removeFederation = async (federation: FederationOption) => {
    setDeletingId(federation.id);
    setError(null);
    try {
      await api.delete(`/federations/${federation.id}`);
      if (selectedFederationId === federation.id) onSelect('');
      if (editingId === federation.id) resetEditor();
      await onChanged();
    } catch (requestError: any) {
      setError(getRequestError(requestError, 'Không thể xóa liên đoàn.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      open={open}
      title="Quản lý liên đoàn / đơn vị"
      footer={null}
      width={680}
      maskClosable={!saving && !deletingId}
      onCancel={onClose}
    >
      <div className="space-y-4 pt-2">
        {error && (
          <Alert
            type="error"
            showIcon
            closable
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <div>
          <Typography.Text strong>Quốc gia</Typography.Text>
          <Select
            size="large"
            showSearch
            optionFilterProp="searchText"
            className="mt-2 w-full"
            placeholder="Chọn quốc gia"
            value={countryId || undefined}
            onChange={(value) => {
              setCountryId(value);
              resetEditor();
              setError(null);
            }}
            options={countries.map((country) => ({
              value: country.id,
              searchText: `${country.code} ${country.name}`,
              label: <CountryLabel country={country} />,
            }))}
          />
        </div>

        <div>
          <Typography.Text strong>
            {editingId ? 'Sửa tên liên đoàn' : 'Thêm liên đoàn mới'}
          </Typography.Text>
          <Space.Compact className="mt-2 flex w-full">
            <Input
              size="large"
              value={name}
              placeholder="Nhập tên liên đoàn / đơn vị"
              maxLength={180}
              disabled={!countryId}
              onChange={(event) => setName(event.target.value)}
              onPressEnter={saveFederation}
            />
            {editingId && (
              <Tooltip title="Hủy sửa">
                <Button
                  size="large"
                  htmlType="button"
                  aria-label="Hủy sửa"
                  icon={<X className="h-4 w-4" />}
                  onClick={resetEditor}
                />
              </Tooltip>
            )}
            <Button
              type="primary"
              size="large"
              htmlType="button"
              loading={saving}
              disabled={!countryId || !name.trim()}
              icon={editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              onClick={saveFederation}
            >
              {editingId ? 'Lưu' : 'Thêm'}
            </Button>
          </Space.Compact>
        </div>

        <div>
          <Typography.Text strong>Danh sách liên đoàn</Typography.Text>
          <List
            className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-sdark-700 px-3"
            loading={loading}
            dataSource={visibleFederations}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Quốc gia này chưa có liên đoàn"
                />
              ),
            }}
            renderItem={(federation) => {
              const selected = federation.id === selectedFederationId;
              return (
                <List.Item
                  actions={[
                    <Tooltip key="select" title={selected ? 'Đang được chọn' : 'Chọn liên đoàn này'}>
                      <Button
                        type={selected ? 'primary' : 'text'}
                        size="small"
                        htmlType="button"
                        aria-label="Chọn liên đoàn"
                        icon={<Check className="h-4 w-4" />}
                        onClick={() => onSelect(federation.id)}
                      />
                    </Tooltip>,
                    <Tooltip key="edit" title="Sửa tên">
                      <Button
                        type="text"
                        size="small"
                        htmlType="button"
                        aria-label="Sửa tên liên đoàn"
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => {
                          setEditingId(federation.id);
                          setName(federation.name);
                          setError(null);
                        }}
                      />
                    </Tooltip>,
                    canDelete ? <Popconfirm
                      key="delete"
                      title={`Xóa “${federation.name}”?`}
                      description="Chỉ có thể xóa liên đoàn chưa được vận động viên sử dụng."
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => removeFederation(federation)}
                    >
                      <Tooltip title="Xóa">
                        <Button
                          type="text"
                          danger
                          size="small"
                          htmlType="button"
                          aria-label="Xóa liên đoàn"
                          loading={deletingId === federation.id}
                          icon={<Trash2 className="h-4 w-4" />}
                        />
                      </Tooltip>
                    </Popconfirm> : null,
                  ]}
                >
                  <Typography.Text>{federation.name}</Typography.Text>
                  {selected && <Tag color="blue">Đang chọn</Tag>}
                </List.Item>
              );
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

function getRequestError(error: any, fallback: string) {
  const message = error.response?.data?.message || error.message || fallback;
  return Array.isArray(message) ? message.join(', ') : message;
}

function uniqueCategories(categories: any[]) {
  const unique = new Map<string, any>();

  for (const category of categories) {
    const key = `${category.sportId}:${category.name.trim().toLocaleLowerCase('vi')}`;
    const current = unique.get(key);
    const completeness = categoryCompleteness(category);

    if (!current || completeness > categoryCompleteness(current)) {
      unique.set(key, category);
    }
  }

  return Array.from(unique.values());
}

function categoryCompleteness(category: any) {
  return [
    category.discipline,
    category.uniform,
    category.beltLevel,
    category.matchDurationSeconds,
    category.minAge,
    category.maxAge,
    category.minWeight,
    category.maxWeight,
  ].filter((value) => value != null).length;
}

function formatCategoryLabel(category: any) {
  const gender = category.gender === 'FEMALE' ? 'Nữ' : category.gender === 'MIXED' ? 'Hỗn hợp' : 'Nam';
  const weight = category.minWeight != null && category.maxWeight != null
    ? `${category.minWeight}–${category.maxWeight} kg`
    : category.maxWeight != null
      ? `đến ${category.maxWeight} kg`
      : category.minWeight != null
        ? `từ ${category.minWeight} kg`
        : null;

  return [category.name, gender, weight].filter(Boolean).join(' · ');
}

function ControlledField({ name, control, label, error, children, wide = false }: { name: keyof AthleteFormValues; control: any; label: ReactNode; error?: string; children: (field: any) => React.ReactElement; wide?: boolean }) {
  return (
    <Col xs={24} md={wide ? 24 : 12}>
      <Form.Item label={label} validateStatus={error ? 'error' : undefined} help={error} required>
        <Controller name={name} control={control} render={({ field }) => children(field)} />
      </Form.Item>
    </Col>
  );
}

export function FormActions({ pending, label, cancelHref }: { pending: boolean; label: string; cancelHref: string }) {
  return (
    <div className="mt-6 flex justify-end">
      <Space>
        <Button href={cancelHref} size="large">Hủy</Button>
        <Button type="primary" htmlType="submit" size="large" loading={pending} icon={<Save className="h-4 w-4" />}>{label}</Button>
      </Space>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return <Alert className="mb-5" type="error" showIcon message="Không thể lưu dữ liệu" description={message} />;
}
