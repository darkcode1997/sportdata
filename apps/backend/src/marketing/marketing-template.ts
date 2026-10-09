export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]!);
}

export function plainSummary(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

export function marketingTemplate(input: {
  name: string; title: string; summary: string; url: string;
  unsubscribeUrl: string; kind: string; imageUrl?: string | null;
}) {
  const label = input.kind === 'EVENT' ? 'SỰ KIỆN MỚI' : 'TIN TỨC SPORTDATA';
  const action = input.kind === 'EVENT' ? 'Khám phá sự kiện' : 'Đọc bài viết';
  const safe = escapeHtml;
  const image = input.imageUrl && /^https:\/\//i.test(input.imageUrl)
    ? `<img src="${safe(input.imageUrl)}" alt="" width="600" style="width:100%;height:auto;display:block" />` : '';
  return {
    subject: `[SportData] ${input.title.replace(/[\r\n]/g, ' ').slice(0, 180)}`,
    text: `Xin chào ${input.name},\n\n${input.title}\n${input.summary}\n\n${action}: ${input.url}\n\nBạn nhận email vì đã đăng ký nhận tin SportData. Hủy đăng ký: ${input.unsubscribeUrl}`,
    html: `<!doctype html><html lang="vi"><body style="margin:0;background:#eef2f6;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="padding:24px 32px;background:#082f49;color:#fff;font-size:24px;font-weight:bold">SportData<span style="display:block;font-size:12px;font-weight:normal;color:#7dd3fc;margin-top:8px">Kết nối cộng đồng thể thao</span></td></tr>${image ? `<tr><td>${image}</td></tr>` : ''}<tr><td style="padding:32px"><p style="font-size:12px;letter-spacing:2px;color:#0284c7;font-weight:bold">${label}</p><p style="font-size:15px;line-height:1.6">Xin chào ${safe(input.name)},</p><h1 style="font-size:26px;line-height:1.35;margin:16px 0">${safe(input.title)}</h1><p style="font-size:16px;line-height:1.8;color:#475569">${safe(input.summary)}</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#0284c7"><a href="${safe(input.url)}" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-weight:bold">${action} →</a></td></tr></table><p style="margin-top:28px;font-size:14px;color:#64748b">Hẹn gặp bạn trên SportData,<br>Đội ngũ SportData</p></td></tr><tr><td style="padding:24px 32px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.8">Bạn nhận email này vì đã đăng ký nhận tin trên SportData.<br><a href="${safe(input.unsubscribeUrl)}" style="color:#475569">Hủy đăng ký nhận email giới thiệu</a> · <a href="${safe(new URL('/account/email-preferences', input.url).href)}" style="color:#475569">Quản lý nhận tin</a></td></tr></table></td></tr></table></body></html>`,
  };
}
