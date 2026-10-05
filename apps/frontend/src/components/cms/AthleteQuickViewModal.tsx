'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Avatar, Button, Descriptions, Empty, Image, Modal, Skeleton, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Pencil, UserRound } from 'lucide-react';
import { api, fetcher } from '@/lib/api';

type AthleteQuickViewModalProps = {
  athleteId?: string;
  open: boolean;
  onClose: () => void;
};

type AthleteDocument = {
  id: string;
  type: 'CCCD_FRONT' | 'CCCD_BACK' | 'PASSPORT';
  mimeType: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | null;
  verificationNote?: string | null;
};

const documentLabels = {
  CCCD_FRONT: 'CCCD mặt trước',
  CCCD_BACK: 'CCCD mặt sau',
  PASSPORT: 'Hộ chiếu',
};

function AthleteAvatarPreview({ athleteId, name }: { athleteId: string; name: string }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void api.get(`/participant-auth/avatar/${athleteId}`, { responseType: 'blob' })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setUrl(undefined);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [athleteId]);

  if (!url) {
    return <Avatar size={72} icon={<UserRound className="h-8 w-8" />} />;
  }

  return (
    <Image
      src={url}
      alt={`Ảnh đại diện ${name}`}
      width={72}
      height={72}
      className="rounded-full object-cover"
      preview={{ mask: <span className="text-xs font-medium">Xem ảnh</span> }}
    />
  );
}

function ProtectedDocumentPreview({ athleteId, document }: { athleteId: string; document: AthleteDocument }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void api.get(`/participant-auth/admin/athletes/${athleteId}/media/${document.type}`, { responseType: 'blob' })
      .then((response) => {
        if (!active) return;
        const blob = response.data instanceof Blob
          ? new Blob([response.data], { type: document.mimeType })
          : new Blob([response.data], { type: document.mimeType });
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setUrl(undefined);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [athleteId, document.mimeType, document.type]);

  const status = document.verificationStatus === 'VERIFIED'
    ? { color: 'success', label: 'Đã xác thực' }
    : document.verificationStatus === 'REJECTED'
      ? { color: 'error', label: 'Từ chối' }
      : { color: 'processing', label: 'Chờ xác thực' };
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300/15">
      <div className="flex items-center justify-between gap-2 border-b border-slate-300/10 px-3 py-2">
        <strong className="text-sm">{documentLabels[document.type]}</strong>
        <Tag color={status.color}>{status.label}</Tag>
      </div>
      <div className="grid h-44 place-items-center bg-slate-950/20">
        {!url ? <Skeleton.Image active /> : document.mimeType === 'application/pdf'
          ? <iframe src={`${url}#toolbar=0&navpanes=0`} title={documentLabels[document.type]} className="h-full w-full bg-white" />
          : <Image src={url} alt={documentLabels[document.type]} width="100%" height={176} className="object-contain" />}
      </div>
      {document.verificationNote
        && !document.verificationNote.toLocaleLowerCase('vi').includes('tự động duyệt vì ocr')
        && <div className="px-3 py-2 text-xs text-slate-500">{document.verificationNote}</div>}
    </div>
  );
}

export function AthleteQuickViewModal({ athleteId, open, onClose }: AthleteQuickViewModalProps) {
  const [returnTo, setReturnTo] = useState('/cms/athletes');
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const { data: athlete, isLoading } = useSWR<any>(open && athleteId ? `/athletes/${athleteId}` : null, fetcher);
  const { data: documents = [], isLoading: documentsLoading } = useSWR<AthleteDocument[]>(open && athleteId ? `/athletes/${athleteId}/documents` : null, fetcher);
  const statistics = athlete?.statistics || [];
  useEffect(() => {
    if (open) setReturnTo(`${window.location.pathname}${window.location.search}`);
  }, [open]);
  const totals = statistics.reduce((sum: any, item: any) => ({
    matches: sum.matches + (item.totalMatches || 0),
    wins: sum.wins + (item.totalWins || 0),
    losses: sum.losses + (item.totalLosses || 0),
    draws: sum.draws + (item.totalDraws || 0),
    gold: sum.gold + (item.goldMedals || 0),
    silver: sum.silver + (item.silverMedals || 0),
    bronze: sum.bronze + (item.bronzeMedals || 0),
  }), { matches: 0, wins: 0, losses: 0, draws: 0, gold: 0, silver: 0, bronze: 0 });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      title={<div className="flex items-center justify-between gap-3 pr-8"><span>Thông tin vận động viên</span>{athleteId && ['ADMIN', 'CONTENT', 'GAMES_ADMIN'].includes(currentUser?.role) && <Button type="primary" size="small" href={`/cms/athletes/${athleteId}/edit?returnTo=${encodeURIComponent(returnTo)}`} icon={<Pencil className="h-4 w-4" />}>Chỉnh sửa hồ sơ</Button>}</div>}
      destroyOnHidden
    >
      {isLoading || !athlete ? <Skeleton active avatar paragraph={{ rows: 6 }} /> : (
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-500/5 p-4">
            <AthleteAvatarPreview athleteId={athlete.id} name={athlete.fullName} />
            <div>
              <Typography.Title level={3} className="!mb-1">{athlete.fullName}</Typography.Title>
              <Space wrap>
                <Tag color="blue">{athlete.country?.name || athlete.country?.code || 'Chưa có quốc gia'}</Tag>
                <Tag>{athlete.federation?.name || 'VĐV tự do'}</Tag>
              </Space>
            </div>
          </div>

          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Ngày sinh">{athlete.birthDate ? new Date(athlete.birthDate).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Giới tính">{athlete.gender === 'MALE' ? 'Nam' : athlete.gender === 'FEMALE' ? 'Nữ' : 'Khác'}</Descriptions.Item>
            <Descriptions.Item label="Cân nặng">{athlete.weight ? `${athlete.weight} kg` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Chiều cao">{athlete.height ? `${athlete.height} cm` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Họ">{athlete.firstName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Tên">{athlete.lastName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{athlete.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{athlete.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Hạng đấu">{(athlete.categories || []).map((item: any) => item.name).join(', ') || '—'}</Descriptions.Item>
            <Descriptions.Item label="Sự kiện">{(athlete.events || []).map((item: any) => item.name).join(', ') || '—'}</Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5}>Giấy tờ định danh</Typography.Title>
            {documentsLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : documents.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {documents.map((document) => <ProtectedDocumentPreview key={document.id} athleteId={athlete.id} document={document} />)}
              </div>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có CCCD hoặc hộ chiếu" />}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <Statistic title="Trận" value={totals.matches} />
            <Statistic title="Thắng" value={totals.wins} valueStyle={{ color: '#059669' }} />
            <Statistic title="Thua" value={totals.losses} valueStyle={{ color: '#dc2626' }} />
            <Statistic title="HCV" value={totals.gold} valueStyle={{ color: '#d97706' }} />
            <Statistic title="HCB" value={totals.silver} />
            <Statistic title="HCĐ" value={totals.bronze} valueStyle={{ color: '#92400e' }} />
          </div>

          <div>
            <Typography.Title level={5}>Thành tích theo giải đấu</Typography.Title>
            {statistics.length ? (
              <Table<any>
                rowKey={(row: any) => `${row.eventId}:${row.sportId}:${row.categoryId}`}
                size="small"
                pagination={false}
                dataSource={statistics}
                scroll={{ x: 620 }}
                columns={[
                  { title: 'Giải đấu', render: (_, row: any) => row.event?.name || '—' },
                  { title: 'Bộ môn', render: (_, row: any) => row.sport?.name || '—' },
                  { title: 'Trận', dataIndex: 'totalMatches', width: 70 },
                  { title: 'T–H–B', width: 105, render: (_, row: any) => `${row.totalWins || 0}–${row.totalDraws || 0}–${row.totalLosses || 0}` },
                  { title: 'Huy chương', width: 130, render: (_, row: any) => `🥇 ${row.goldMedals || 0}  🥈 ${row.silverMedals || 0}  🥉 ${row.bronzeMedals || 0}` },
                ]}
              />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thành tích được ghi nhận" />}
          </div>
        </div>
      )}
    </Modal>
  );
}
