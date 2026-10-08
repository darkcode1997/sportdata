'use client';

import { useState } from 'react';
import { Button, Card, Col, Form, Input, Result, Row } from 'antd';
import { ArrowUpRight, CheckCircle2, Clock3, Mail, MapPin, MessageSquareText, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';

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
  const toast = useSportDataToast();

  const submit = async (values: ContactFormValues) => {
    setSubmitting(true);
    try {
      await api.post('/contacts', values);
      form.resetFields();
      setSubmitted(true);
      toast.success('Đã gửi liên hệ. Chúng tôi sẽ phản hồi qua email sớm nhất.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể gửi liên hệ. Vui lòng thử lại.';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="contact-page contact-studio min-h-screen pb-20">
      <section className="contact-hero">
        <div className="editorial-container editorial-heading">
          <div>
            <span className="contact-eyebrow"><MessageSquareText size={16} /> Đồng hành cùng bạn</span>
            <h1>Cùng tạo nên <span>sự kiện tốt hơn.</span></h1>
          </div>
          <div className="editorial-heading-intro">
            <p>Từ câu hỏi đầu tiên đến kế hoạch tổ chức giải đấu, SportData luôn sẵn sàng lắng nghe.</p>
            <a href="mailto:contact@sportdata.vn">contact@sportdata.vn <ArrowUpRight size={16} /></a>
          </div>
        </div>
      </section>

      <div className="editorial-container editorial-content">
        <div className="contact-layout">
          <div className="contact-support space-y-5">
            <div>
              <span className="editorial-kicker">Kết nối với SportData</span>
              <h2>Bạn cần hỗ trợ gì?</h2>
              <p>Chọn chủ đề và chia sẻ thêm thông tin để chúng tôi hỗ trợ bạn đúng nhu cầu.</p>
            </div>
            <div className="contact-topic-list">
              {['Đăng ký & thi đấu', 'Tổ chức sự kiện', 'Hợp tác cùng SportData'].map((topic) => (
                <button key={topic} type="button" onClick={() => {
                  form.setFieldValue('subject', topic);
                  setSubmitted(false);
                  document.getElementById('contact-message-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}>{topic}<ArrowUpRight size={16} /></button>
              ))}
            </div>
            <div className="contact-support-divider" />
            <ContactInfo icon={Mail} label="Email" value="contact@sportdata.vn" href="mailto:contact@sportdata.vn" />
            <ContactInfo icon={Clock3} label="Thời gian phản hồi" value="Trong vòng 1–2 ngày làm việc" />
            <ContactInfo icon={MapPin} label="Khu vực hỗ trợ" value="Việt Nam và Đông Nam Á" />
          </div>

          <Card className="contact-form-card public-surface" id="contact-message-form">
            {submitted ? (
              <Result
                icon={<CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />}
                title="Đã gửi liên hệ"
                subTitle="Cảm ơn bạn. Chúng tôi sẽ phản hồi qua email trong thời gian sớm nhất."
                extra={<Button type="primary" onClick={() => setSubmitted(false)}>Gửi liên hệ khác</Button>}
              />
            ) : (
              <Form form={form} layout="vertical" requiredMark onFinish={submit}>
                <div className="contact-form-heading">
                  <span className="contact-form-icon"><MessageSquareText size={22} /></span>
                  <div>
                    <h2>Gửi lời nhắn</h2>
                    <p>Chúng tôi sẽ phản hồi qua email bạn cung cấp.</p>
                  </div>
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }, { min: 2, max: 120 }]}>
                      <Input size="large" autoComplete="name" placeholder="Nguyễn Văn A" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
                      <Input size="large" type="email" autoComplete="email" placeholder="email@example.com" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="phone" label="Số điện thoại" rules={[{ max: 30 }]}>
                      <Input size="large" type="tel" autoComplete="tel" placeholder="Không bắt buộc" />
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
