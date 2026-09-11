'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Skeleton,
  Tag,
  Tooltip,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Dumbbell, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';

const emptySport = { name: '', code: '', description: '', logoUrl: '' };
const emptyCategory = {
  name: '',
  gender: 'MALE',
  discipline: 'NEWAZA',
  uniform: 'GI',
  beltLevel: 'OPEN',
  matchDurationSeconds: '300',
  minAge: '',
  maxAge: '',
  minWeight: '',
  maxWeight: '',
};
const disciplineOptions = [
  { value: 'NEWAZA', label: 'Newaza · Địa chiến' },
  { value: 'FIGHTING', label: 'Fighting · Đối kháng 3 phần' },
  { value: 'CONTACT', label: 'Contact' },
  { value: 'FULL_CONTACT', label: 'Full Contact' },
  { value: 'DUO', label: 'Duo' },
  { value: 'SHOW', label: 'Show' },
];
const uniformOptions = [
  { value: 'GI', label: 'Gi' },
  { value: 'NO_GI', label: 'No-Gi' },
];
const beltOptions = [
  { value: 'WHITE', label: 'Đai trắng' },
  { value: 'BLUE', label: 'Đai xanh' },
  { value: 'PURPLE', label: 'Đai tím' },
  { value: 'BROWN', label: 'Đai nâu' },
  { value: 'BLACK', label: 'Đai đen' },
  { value: 'OPEN', label: 'Không giới hạn đai' },
];

export default function SportsPage() {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canDelete = currentUser?.role === 'ADMIN';
  const { message: toast } = AntApp.useApp();
  const { data: sports = [], error, isLoading, mutate } = useSWR<any[]>('/sports', fetcher);
  const [sportOpen, setSportOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categorySport, setCategorySport] = useState<any>(null);
  const [sportForm, setSportForm] = useState(emptySport);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openSport = (sport?: any) => {
    setEditingSport(sport || null);
    setSportForm(
      sport
        ? {
            name: sport.name,
            code: sport.code,
            description: sport.description || '',
            logoUrl: sport.logoUrl || '',
          }
        : emptySport,
    );
    setErrorMessage(null);
    setSportOpen(true);
  };

  const openCategory = (sport: any, category?: any) => {
    setCategorySport(sport);
    setEditingCategory(category || null);
    setCategoryForm(category
      ? {
          name: category.name,
          gender: category.gender,
          discipline: category.discipline || 'NEWAZA',
          uniform: category.uniform || 'GI',
          beltLevel: category.beltLevel || 'OPEN',
          matchDurationSeconds: String(category.matchDurationSeconds || 300),
          minAge: category.minAge == null ? '' : String(category.minAge),
          maxAge: category.maxAge == null ? '' : String(category.maxAge),
          minWeight: category.minWeight == null ? '' : String(category.minWeight),
          maxWeight: category.maxWeight == null ? '' : String(category.maxWeight),
        }
      : emptyCategory);
    setErrorMessage(null);
    setCategoryOpen(true);
  };

  const saveSport = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        ...sportForm,
        code: sportForm.code.trim().toUpperCase(),
        description: sportForm.description || undefined,
        logoUrl: sportForm.logoUrl || undefined,
      };
      if (editingSport) await api.patch(`/sports/${editingSport.id}`, payload);
      else await api.post('/sports', payload);
      setSportOpen(false);
      await mutate();
      toast.success(editingSport ? 'Đã cập nhật bộ môn' : 'Đã thêm bộ môn');
    } catch (requestError: any) {
      setErrorMessage(requestError.response?.data?.message || 'Không thể lưu bộ môn.');
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        name: categoryForm.name,
        sportId: categorySport.id,
        gender: categoryForm.gender,
        discipline: categoryForm.discipline || undefined,
        uniform: categoryForm.uniform || undefined,
        beltLevel: categoryForm.beltLevel || undefined,
        matchDurationSeconds: categoryForm.matchDurationSeconds ? Number(categoryForm.matchDurationSeconds) : undefined,
        minAge: categoryForm.minAge ? Number(categoryForm.minAge) : undefined,
        maxAge: categoryForm.maxAge ? Number(categoryForm.maxAge) : undefined,
        minWeight: categoryForm.minWeight ? Number(categoryForm.minWeight) : undefined,
        maxWeight: categoryForm.maxWeight ? Number(categoryForm.maxWeight) : undefined,
      };
      if (editingCategory) await api.patch(`/categories/${editingCategory.id}`, payload);
      else await api.post('/categories', payload);
      setCategoryOpen(false);
      await mutate();
      toast.success(editingCategory ? 'Đã cập nhật hạng đấu' : 'Đã thêm hạng đấu');
    } catch (requestError: any) {
      setErrorMessage(requestError.response?.data?.message || 'Không thể tạo hạng đấu.');
    } finally {
      setSaving(false);
    }
  };

  const removeSport = async (sport: any) => {
    setErrorMessage(null);
    try {
      await api.delete(`/sports/${sport.id}`);
      await mutate();
      toast.success('Đã xóa bộ môn');
    } catch (requestError: any) {
      setErrorMessage(
        requestError.response?.data?.message ||
          'Không thể xóa bộ môn đang được sử dụng.',
      );
    }
  };

  const removeCategory = async (category: any) => {
    setErrorMessage(null);
    try {
      await api.delete(`/categories/${category.id}`);
      await mutate();
      toast.success('Đã xóa hạng đấu');
    } catch (requestError: any) {
      setErrorMessage(
        requestError.response?.data?.message ||
          'Không thể xóa hạng đấu đang được sử dụng.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Bộ môn & hạng đấu"
        description="Cấu hình danh mục dùng khi tạo sự kiện và trận đấu."
        icon={<Dumbbell className="h-6 w-6" />}
        action={<Button type="primary" size="large" icon={<Plus className="h-4 w-4" />} onClick={() => openSport()}>Thêm bộ môn</Button>}
      />

      {(error || errorMessage) && (
        <Alert
          type="error"
          showIcon
          closable={Boolean(errorMessage)}
          onClose={() => setErrorMessage(null)}
          message={errorMessage || 'Không thể tải danh sách bộ môn.'}
        />
      )}

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} className="border-sdark-700 bg-sdark-900">
              <Skeleton active paragraph={{ rows: 5 }} />
            </Card>
          ))}
        </div>
      ) : sports.length === 0 ? (
        <Card className="border-sdark-700 bg-sdark-900">
          <Empty description="Chưa có bộ môn nào" />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {sports.map((sport: any) => (
            <Card
              key={sport.id}
              className="overflow-hidden border-sdark-700 bg-sdark-900"
              styles={{ body: { padding: 0 } }}
            >
              <div className="flex items-start gap-4 border-b border-sdark-700 p-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sblue-500/15 text-sblue-300">
                  <Dumbbell className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-black text-slate-100">{sport.name}</h2>
                    <Tag className="m-0 font-mono font-bold">{sport.code}</Tag>
                    <Tag color="blue" className="m-0">{sport._count?.events || 0} sự kiện</Tag>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {sport.description || 'Chưa có mô tả.'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Tooltip title="Sửa bộ môn">
                    <Button
                      type="text"
                      aria-label="Sửa bộ môn"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => openSport(sport)}
                    />
                  </Tooltip>
                  {canDelete && <Popconfirm
                    title="Xóa bộ môn?"
                    description="Các hạng đấu và dữ liệu thi đấu chỉ thuộc bộ môn này cũng sẽ bị xóa."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeSport(sport)}
                  >
                    <Tooltip title="Xóa bộ môn">
                      <Button
                        type="text"
                        danger
                        aria-label="Xóa bộ môn"
                        icon={<Trash2 className="h-4 w-4" />}
                      />
                    </Tooltip>
                  </Popconfirm>}
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <Tags className="h-4 w-4 text-sblue-400" />
                    Hạng đấu ({sport.categories?.length || 0})
                  </h3>
                  <Button type="link" size="small" onClick={() => openCategory(sport)}>
                    Thêm hạng
                  </Button>
                </div>
                <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
                  {(sport.categories || []).map((category: any) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-xl bg-sdark-800/55 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">{category.name}</p>
                        <p className="text-xs text-slate-500">
                          {category.gender === 'FEMALE'
                            ? 'Nữ'
                            : category.gender === 'MIXED'
                              ? 'Hỗn hợp'
                              : 'Nam'}
                          {category.maxWeight ? ` · đến ${category.maxWeight}kg` : ''}
                          {category.discipline ? ` · ${disciplineOptions.find((item) => item.value === category.discipline)?.label || category.discipline}` : ''}
                          {category.uniform ? ` · ${category.uniform === 'NO_GI' ? 'No-Gi' : 'Gi'}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="text"
                          size="small"
                          aria-label="Chỉnh sửa hạng đấu"
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => openCategory(sport, category)}
                        />
                        {canDelete && <Popconfirm
                          title="Xóa hạng đấu?"
                          description="Các trận đấu và sơ đồ thuộc hạng này cũng sẽ bị xóa."
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => removeCategory(category)}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            aria-label="Xóa hạng đấu"
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                          />
                        </Popconfirm>}
                      </div>
                    </div>
                  ))}
                  {!sport.categories?.length && <Empty description="Chưa có hạng đấu" />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={sportOpen}
        onClose={() => setSportOpen(false)}
        title={editingSport ? 'Chỉnh sửa bộ môn' : 'Thêm bộ môn'}
      >
        <Form layout="vertical" requiredMark={false} onFinish={saveSport}>
          <Field label="Tên bộ môn *">
            <Input
              required
              value={sportForm.name}
              onChange={(event) => setSportForm({ ...sportForm, name: event.target.value })}
            />
          </Field>
          <Field label="Mã viết tắt *">
            <Input
              required
              maxLength={10}
              className="font-mono uppercase"
              value={sportForm.code}
              onChange={(event) => setSportForm({ ...sportForm, code: event.target.value })}
            />
          </Field>
          <Field label="Mô tả">
            <TextArea
              rows={3}
              value={sportForm.description}
              onChange={(event) => setSportForm({ ...sportForm, description: event.target.value })}
            />
          </Field>
          <Field label="URL logo">
            <Input
              type="url"
              value={sportForm.logoUrl}
              onChange={(event) => setSportForm({ ...sportForm, logoUrl: event.target.value })}
            />
          </Field>
          <Button type="primary" htmlType="submit" block loading={saving}>
            Lưu bộ môn
          </Button>
        </Form>
      </Modal>

      <Modal
        isOpen={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title={`${editingCategory ? 'Chỉnh sửa' : 'Thêm'} hạng đấu · ${categorySport?.name || ''}`}
        size="lg"
      >
        <Form layout="vertical" requiredMark={false} onFinish={saveCategory}>
          <Field label="Tên hạng đấu *">
            <Input
              required
              value={categoryForm.name}
              onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
            />
          </Field>
          <Field label="Giới tính">
            <Select
              className="w-full"
              value={categoryForm.gender}
              options={[
                { value: 'MALE', label: 'Nam' },
                { value: 'FEMALE', label: 'Nữ' },
                { value: 'MIXED', label: 'Hỗn hợp' },
              ]}
              onChange={(gender) => setCategoryForm({ ...categoryForm, gender })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Nội dung thi đấu">
              <Select className="w-full" value={categoryForm.discipline} options={disciplineOptions} onChange={(discipline) => setCategoryForm({ ...categoryForm, discipline })} />
            </Field>
            <Field label="Trang phục">
              <Select className="w-full" value={categoryForm.uniform} options={uniformOptions} onChange={(uniform) => setCategoryForm({ ...categoryForm, uniform })} />
            </Field>
            <Field label="Trình độ đai">
              <Select className="w-full" value={categoryForm.beltLevel} options={beltOptions} onChange={(beltLevel) => setCategoryForm({ ...categoryForm, beltLevel })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Tuổi tối thiểu" value={categoryForm.minAge} onChange={(minAge) => setCategoryForm({ ...categoryForm, minAge })} />
            <NumberField label="Tuổi tối đa" value={categoryForm.maxAge} onChange={(maxAge) => setCategoryForm({ ...categoryForm, maxAge })} />
            <NumberField label="Cân nặng tối thiểu" value={categoryForm.minWeight} step={0.1} onChange={(minWeight) => setCategoryForm({ ...categoryForm, minWeight })} />
            <NumberField label="Cân nặng tối đa" value={categoryForm.maxWeight} step={0.1} onChange={(maxWeight) => setCategoryForm({ ...categoryForm, maxWeight })} />
            <NumberField label="Thời lượng trận (giây)" value={categoryForm.matchDurationSeconds} onChange={(matchDurationSeconds) => setCategoryForm({ ...categoryForm, matchDurationSeconds })} />
          </div>
          <Button type="primary" htmlType="submit" block loading={saving}>
            {editingCategory ? 'Lưu hạng đấu' : 'Tạo hạng đấu'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Form.Item label={label}>{children}</Form.Item>;
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: string;
  step?: number;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <InputNumber
        min={0}
        step={step}
        value={value === '' ? null : Number(value)}
        className="w-full"
        onChange={(nextValue) => onChange(nextValue === null ? '' : String(nextValue))}
      />
    </Field>
  );
}
