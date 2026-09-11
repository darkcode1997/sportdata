'use client';

import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, Result, Row } from 'antd';
import { CheckCircle2, Clock3, Mail, MapPin, MessageSquareText, Send } from 'lucide-react';
import { api } from '@/lib/api';

type ContactFormValues = {
  fullName: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

export default function ContactPage() {
  const [form] = Form.useForm<ContactFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const submit = async (values: ContactFormValues) => {
    setSubmitting(true);
    setRequestError(null);
    try {
      await api.post('/contacts', values);
      form.resetFields();
      setSubmitted(true);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể gửi liên hệ. Vui lòng thử lại.';
      setRequestError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="contact-page min-h-screen pb-20">
      <section className="contact-hero border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <span className="contact-eyebrow"><MessageSquareText className="h-4 w-4" /> Liên hệ</span>
          <h1>Kết nối với SportData</h1>
          <p>Gửi câu hỏi, yêu cầu hỗ trợ hoặc đề xuất hợp tác. Đội ngũ của chúng tôi sẽ phản hồi qua email.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="contact-layout">
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-100">Thông tin liên hệ</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">Mọi nội dung gửi từ biểu mẫu đều được lưu trong CMS để đội ngũ phụ trách theo dõi và phản hồi.</p>
            </div>
            <ContactInfo icon={Mail} label="Email" value="contact@sportdata.vn" href="mailto:contact@sportdata.vn" />
            <ContactInfo icon={Clock3} label="Thời gian phản hồi" value="Trong vòng 1–2 ngày làm việc" />
            <ContactInfo icon={MapPin} label="Khu vực hỗ trợ" value="Việt Nam và Đông Nam Á" />
          </div>

          <Card className="contact-form-card public-surface">
            {submitted ? (
              <Result
                icon={<CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />}
                title="Đã gửi liên hệ"
                subTitle="Cảm ơn bạn. Chúng tôi sẽ phản hồi qua email trong thời gian sớm nhất."
                extra={<Button type="primary" onClick={() => setSubmitted(false)}>Gửi liên hệ khác</Button>}
              />
            ) : (
              <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
                <div className="mb-6">
                  <h2 className="text-xl font-extrabold text-slate-100">Gửi lời nhắn</h2>
                  <p className="mt-1 text-sm text-slate-500">Các trường có dấu * là bắt buộc.</p>
                </div>
                {requestError && <Alert className="mb-5" type="error" showIcon message={requestError} />}
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }, { min: 2, max: 120 }]}>
                      <Input size="large" placeholder="Nguyễn Văn A" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
                      <Input size="large" type="email" placeholder="email@example.com" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="phone" label="Số điện thoại" rules={[{ max: 30 }]}>
                      <Input size="large" placeholder="Không bắt buộc" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="subject" label="Chủ đề" rules={[{ max: 180 }]}>
                      <Input size="large" placeholder="Nội dung cần hỗ trợ" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="message" label="Nội dung" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }, { min: 10, message: 'Nội dung phải có ít nhất 10 ký tự' }, { max: 5000 }]}>
                      <Input.TextArea rows={6} showCount maxLength={5000} placeholder="Hãy cho chúng tôi biết bạn cần hỗ trợ gì..." />
                    </Form.Item>
                  </Col>
                </Row>
                <Button block type="primary" size="large" htmlType="submit" loading={submitting} icon={<Send className="h-4 w-4" />}>
                  Gửi liên hệ
                </Button>
                <p className="mt-4 text-center text-xs leading-5 text-slate-500">Thông tin của bạn chỉ được dùng để xử lý yêu cầu liên hệ.</p>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

function ContactInfo({ icon: Icon, label, value, href }: { icon: any; label: string; value: string; href?: string }) {
  const content = (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
  return (
    <div className="contact-info-card">
      <span><Icon className="h-5 w-5" /></span>
      {href ? <a href={href}>{content}</a> : content}
    </div>
  );
}
