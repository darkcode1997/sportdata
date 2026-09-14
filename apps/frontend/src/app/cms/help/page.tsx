'use client';

import useSWR from 'swr';
import {
  Alert,
  Card,
  Col,
  Collapse,
  Descriptions,
  Row,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AlertTriangle, BookOpen, Building2, CheckCircle2, Globe2, KeyRound, ShieldCheck } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import {
  CMS_ROLE_INFO,
  CMS_ROLES,
  DEMO_ROLE_USERNAMES,
  isCmsRole,
  type CmsRole,
} from '@/lib/cms-access';
import { fetcher } from '@/lib/api';

type RoleRow = {
  key: CmsRole;
  role: CmsRole;
  username: string;
  scope: string;
};

const roleRows: RoleRow[] = CMS_ROLES.map((role) => ({
  key: role,
  role,
  username: DEMO_ROLE_USERNAMES[role],
  scope: CMS_ROLE_INFO[role].description,
}));

const columns: ColumnsType<RoleRow> = [
  {
    title: 'Vai trò',
    dataIndex: 'role',
    width: 190,
    render: (role: CmsRole) => <Tag color={role === 'ADMIN' || role === 'GAMES_ADMIN' ? 'blue' : 'cyan'}>{CMS_ROLE_INFO[role].label}</Tag>,
  },
  {
    title: 'Username demo',
    dataIndex: 'username',
    width: 180,
    render: (username: string) => <Typography.Text code>{username}</Typography.Text>,
  },
  { title: 'Phạm vi', dataIndex: 'scope' },
];

export default function CmsHelpPage() {
  const { data: profile } = useSWR<{ role?: string; name?: string }>('/auth/profile', fetcher);
  const currentRole = isCmsRole(profile?.role) ? profile.role : 'READ_ONLY';
  const currentInfo = CMS_ROLE_INFO[currentRole];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Hướng dẫn sử dụng CMS"
        description="Quy trình thao tác và phạm vi quyền dành cho từng vị trí vận hành đại hội."
        icon={<BookOpen className="h-6 w-6" />}
      />

      <Alert
        showIcon
        type="info"
        message={`Bạn đang đăng nhập với vai trò: ${currentInfo.label}`}
        description={currentInfo.description}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Card
            className="cms-surface h-full"
            title={<Space><ShieldCheck className="h-5 w-5 text-sblue-500" />Quyền của bạn</Space>}
          >
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="Trang bắt đầu">
                <Typography.Text code>{currentInfo.startPath}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Được phép">
                <Space wrap>{currentInfo.capabilities.map((item) => <Tag color="success" key={item}>{item}</Tag>)}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="Giới hạn">
                <ul className="m-0 space-y-1 pl-5">
                  {currentInfo.restrictions.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} xl={15}>
          <Card className="cms-surface h-full" title="Quy trình vận hành tiêu chuẩn">
            <Steps
              responsive
              current={-1}
              items={[
                { title: 'Chuẩn bị', description: 'Sự kiện, môn, hạng mục và đăng ký' },
                { title: 'Tài nguyên', description: 'Địa điểm, sân/sàn, ca và khung giờ' },
                { title: 'Thi đấu', description: 'Sinh cây, xếp và khóa lịch' },
                { title: 'Kết quả', description: 'Nhập, xác nhận, duyệt và công bố' },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card className="cms-surface" title="Chọn mô hình tổ chức sự kiện">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card size="small" title={<Space><Globe2 className="h-5 w-5 text-purple-500" />Giải quốc tế / đại hội</Space>}>
              <ol className="m-0 space-y-2 pl-5">
                <li>Chọn quy mô <strong>Quốc tế</strong> và đơn vị đăng cai.</li>
                <li>Chọn các liên đoàn hoặc đoàn thể thao tham gia.</li>
                <li>Chọn nhiều bộ môn, hạng mục và lọc VĐV theo quốc gia.</li>
                <li>Thiết lập venue, FOP và session trước khi xếp lịch.</li>
              </ol>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title={<Space><Building2 className="h-5 w-5 text-cyan-500" />Giải trung tâm / CLB trong nước</Space>}>
              <ol className="m-0 space-y-2 pl-5">
                <li>Tạo đơn vị loại <strong>Trung tâm</strong>, <strong>CLB</strong> hoặc <strong>Học viện</strong> trong hồ sơ VĐV.</li>
                <li>Chọn quy mô Toàn quốc, Tỉnh/thành hoặc Nội bộ trung tâm.</li>
                <li>Chọn đơn vị tổ chức và danh sách đơn vị được tham gia.</li>
                <li>Hệ thống chỉ hiển thị VĐV đúng hạng mục và đúng đơn vị đã chọn.</li>
              </ol>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card className="cms-surface" title="Thao tác theo vai trò">
        <Collapse
          defaultActiveKey={[currentRole]}
          items={CMS_ROLES.map((role) => {
            const info = CMS_ROLE_INFO[role];
            return {
              key: role,
              label: (
                <Space wrap>
                  <Typography.Text strong>{info.label}</Typography.Text>
                  {role === currentRole && <Tag color="blue">Vai trò hiện tại</Tag>}
                </Space>
              ),
              children: (
                <Row gutter={[20, 12]}>
                  <Col xs={24} md={12}>
                    <Typography.Text strong><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-500" />Được thực hiện</Typography.Text>
                    <ul className="mt-2 space-y-1 pl-5">{info.capabilities.map((item) => <li key={item}>{item}</li>)}</ul>
                  </Col>
                  <Col xs={24} md={12}>
                    <Typography.Text strong><AlertTriangle className="mr-2 inline h-4 w-4 text-amber-500" />Không thuộc quyền</Typography.Text>
                    <ul className="mt-2 space-y-1 pl-5">{info.restrictions.map((item) => <li key={item}>{item}</li>)}</ul>
                  </Col>
                </Row>
              ),
            };
          })}
        />
      </Card>

      <Card
        className="cms-surface"
        title={<Space><KeyRound className="h-5 w-5 text-sblue-500" />Tài khoản thử nghiệm theo vai trò</Space>}
      >
        <Alert
          className="mb-4"
          showIcon
          type="warning"
          message="Chỉ sử dụng cho môi trường demo/test"
          description="Mật khẩu do quản trị viên cấp hoặc cấu hình qua DEMO_ACCOUNT_PASSWORD. Không bật các tài khoản demo trong production."
        />
        <Table<RoleRow>
          rowKey="key"
          size="small"
          columns={columns}
          dataSource={roleRows}
          pagination={false}
          scroll={{ x: 760 }}
        />
      </Card>
    </div>
  );
}
