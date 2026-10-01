'use client';

import useSWR from 'swr';
import { Avatar, Descriptions, Empty, Modal, Skeleton, Space, Statistic, Table, Tag, Typography } from 'antd';
import { UserRound } from 'lucide-react';
import { fetcher } from '@/lib/api';

type AthleteQuickViewModalProps = {
  athleteId?: string;
  open: boolean;
  onClose: () => void;
};

export function AthleteQuickViewModal({ athleteId, open, onClose }: AthleteQuickViewModalProps) {
  const { data: athlete, isLoading } = useSWR<any>(open && athleteId ? `/athletes/${athleteId}` : null, fetcher);
  const statistics = athlete?.statistics || [];
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
    <Modal open={open} onCancel={onClose} footer={null} width={760} title="Thông tin vận động viên" destroyOnHidden>
      {isLoading || !athlete ? <Skeleton active avatar paragraph={{ rows: 6 }} /> : (
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-500/5 p-4">
            <Avatar size={72} src={athlete.photoUrl || `/api/participant-auth/avatar/${athlete.id}`} icon={<UserRound className="h-8 w-8" />} />
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
            <Descriptions.Item label="Hạng đấu">{(athlete.categories || []).map((item: any) => item.name).join(', ') || '—'}</Descriptions.Item>
          </Descriptions>

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
