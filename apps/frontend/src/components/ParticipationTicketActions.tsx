'use client';

import { Button, Space } from 'antd';

export function ParticipationTicketActions({ code, status }: { code: string; status: string }) {
  return <Space wrap>
    <Button href={`/tickets/${encodeURIComponent(code)}`} target="_blank">Xem vé</Button>
    {status === 'CONFIRMED' && <Button type="primary" href={`/api/participant-auth/tickets/${encodeURIComponent(code)}/pdf`} target="_blank">In / tải vé PDF</Button>}
  </Space>;
}
