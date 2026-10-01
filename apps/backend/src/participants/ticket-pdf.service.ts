import { Injectable } from "@nestjs/common";
import pdfMake from "pdfmake/build/pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

export type TicketPayload = {
  ticketCode: string;
  status: string;
  paymentStatus?: string;
  isValid?: boolean;
  event: {
    name: string;
    startDate: Date | string;
    endDate?: Date | string;
    location?: string | null;
    logoUrl?: string | null;
    ticketBackgroundUrl?: string | null;
    ticketThemePreset?: string | null;
    ticketLayout?: string | null;
    ticketPrimaryColor?: string | null;
    ticketSecondaryColor?: string | null;
    ticketAccentColor?: string | null;
  };
  sport?: { name: string } | null;
  category: {
    name: string;
    minWeight?: number | null;
    maxWeight?: number | null;
  };
  athlete: {
    fullName: string;
    birthDate?: Date | string | null;
    gender?: string;
    weight?: number | null;
    country?: { name?: string } | null;
    federation?: { name?: string } | null;
  };
  achievements?: {
    career?: {
      totalMatches?: number;
      totalWins?: number;
      goldMedals?: number;
      silverMedals?: number;
      bronzeMedals?: number;
    };
  };
  assets?: {
    backgroundData?: Buffer | null;
    backgroundMimeType?: string | null;
    avatarData?: Buffer | null;
    avatarMimeType?: string | null;
  };
};

export type TicketBatchMeta = {
  referenceCode: string;
  organizationName?: string | null;
  contactName?: string | null;
};

pdfMake.addVirtualFileSystem(vfsFonts);
pdfMake.addFonts({
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
});

const A6_WIDTH = 297.64;
const A6_HEIGHT = 419.53;

@Injectable()
export class TicketPdfService {
  async generate(tickets: TicketPayload[], batch?: TicketBatchMeta) {
    const pages: Content[] = [];
    if (batch && tickets.length > 1)
      pages.push(this.batchCover(tickets, batch));
    tickets.forEach((ticket) => {
      pages.push({
        ...(pages.length ? { pageBreak: "before" as const } : {}),
        stack: this.ticketPage(ticket),
      });
    });

    const definition: TDocumentDefinitions = {
      pageSize: { width: A6_WIDTH, height: A6_HEIGHT },
      pageMargins: [12, 12, 12, 12],
      defaultStyle: { font: "Roboto", color: "#0f172a", fontSize: 8 },
      content: pages,
      info: {
        title: batch
          ? `Bộ vé A6 ${batch.referenceCode}`
          : `Vé A6 ${tickets[0]?.ticketCode || ""}`,
        author: "SportData Việt Nam",
        subject: "Thẻ đeo vận động viên khổ A6",
      },
    };
    const bytes = await pdfMake.createPdf(definition).getBuffer();
    return Buffer.from(bytes);
  }

  private batchCover(
    tickets: TicketPayload[],
    batch: TicketBatchMeta,
  ): Content {
    return {
      stack: [
        {
          text: "SPORTDATA",
          color: "#38bdf8",
          bold: true,
          fontSize: 13,
          characterSpacing: 1.4,
          margin: [10, 36, 10, 0],
        },
        {
          text: "BỘ THẺ VẬN ĐỘNG VIÊN",
          color: "#ffffff",
          bold: true,
          fontSize: 23,
          margin: [10, 52, 10, 10],
        },
        {
          text: batch.organizationName || "Đơn vị đăng ký",
          color: "#7dd3fc",
          bold: true,
          fontSize: 14,
          margin: [10, 0, 10, 22],
        },
        {
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: [
                    {
                      text: `${tickets.length} VẬN ĐỘNG VIÊN`,
                      bold: true,
                      fontSize: 18,
                      color: "#0369a1",
                    },
                    {
                      text: `Mã hồ sơ: ${batch.referenceCode}`,
                      margin: [0, 8, 0, 0],
                    },
                    {
                      text: `Người liên hệ: ${batch.contactName || "—"}`,
                      margin: [0, 3, 0, 0],
                    },
                    {
                      text: "Các trang tiếp theo là vé A6 riêng để in, cắt và cấp cho từng vận động viên.",
                      color: "#475569",
                      margin: [0, 12, 0, 0],
                    },
                  ],
                  margin: [14, 16, 14, 16],
                  fillColor: "#ffffff",
                },
              ],
            ],
          },
          layout: "noBorders",
          margin: [10, 0, 10, 0],
        },
        {
          text: "Mỗi vé có QR độc lập để kiểm tra thông tin và trạng thái check-in.",
          color: "#cbd5e1",
          alignment: "center",
          fontSize: 8,
          margin: [18, 42, 18, 0],
        },
      ],
    };
  }

  private ticketPage(ticket: TicketPayload): Content[] {
    const verificationUrl = `${(process.env.FRONTEND_URL || "http://localhost:3001").replace(/\/$/, "")}/tickets/${encodeURIComponent(ticket.ticketCode)}`;
    const status = this.status(ticket.status, ticket.isValid, ticket.paymentStatus);
    const theme = this.ticketTheme(ticket);
    const background = this.dataUrl(
      ticket.assets?.backgroundData,
      ticket.assets?.backgroundMimeType,
    );
    const avatar = this.dataUrl(
      ticket.assets?.avatarData,
      ticket.assets?.avatarMimeType,
    );

    const backgroundLayer: Content[] = background
      ? [
          {
            image: background,
            width: A6_WIDTH,
            height: A6_HEIGHT,
            absolutePosition: { x: 0, y: 0 },
          },
        ]
      : [];

    const photo: Content = {
      table: {
        widths: [91],
        heights: [116],
        body: [
          [
            avatar
              ? {
                  image: avatar,
                  fit: [89, 114],
                  alignment: "center",
                  margin: [1, 1, 1, 1],
                  fillColor: "#ffffff",
                }
              : {
                  text: "ẢNH\nVẬN ĐỘNG VIÊN",
                  alignment: "center",
                  color: "#64748b",
                  bold: true,
                  margin: [0, 45, 0, 45],
                  fillColor: "#f8fafc",
                },
          ],
        ],
      },
      layout: {
        hLineColor: () => theme.secondary,
        vLineColor: () => theme.secondary,
        hLineWidth: () => 1,
        vLineWidth: () => 1,
      },
    };

    const qrAndCategory: Content = {
      stack: [
        {
          qr: verificationUrl,
          fit: 72,
          alignment: "center",
          margin: [0, 0, 0, 2],
          foreground: "#07111f",
          background: "#ffffff",
        },
        {
          text: "QUÉT VÉ",
          alignment: "center",
          color: theme.accent,
          bold: true,
          fontSize: 6,
        },
        {
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: [
                    {
                      text: "HẠNG THI ĐẤU",
                      alignment: "center",
                      color: "#e2e8f0",
                      bold: true,
                      fontSize: 6,
                    },
                    {
                      text: ticket.category.name.toLocaleUpperCase("vi"),
                      alignment: "center",
                      color: "#ffffff",
                      bold: true,
                      fontSize: 10,
                      margin: [3, 4, 3, 2],
                    },
                  ],
                  fillColor: theme.primary,
                  margin: [4, 5, 4, 5],
                },
              ],
            ],
          },
          layout: {
            hLineColor: () => theme.secondary,
            vLineColor: () => theme.secondary,
            hLineWidth: () => 1,
            vLineWidth: () => 1,
          },
          margin: [0, 5, 0, 0],
        },
      ],
    };

    const details: Content = {
      table: {
        widths: [51, "*"],
        body: [
          [
            {
              text: "Họ và tên:",
              bold: true,
              fontSize: 8.5,
              border: [false, false, false, false],
            },
            {
              text: ticket.athlete.fullName.toLocaleUpperCase("vi"),
              bold: true,
              fontSize: 10.5,
              border: [false, false, false, true],
              borderColor: ["#ffffff", "#ffffff", "#ffffff", theme.secondary],
            },
          ],
          [
            {
              text: "Đơn vị:",
              bold: true,
              fontSize: 8.5,
              margin: [0, 3, 0, 0],
              border: [false, false, false, false],
            },
            {
              text: ticket.athlete.federation?.name || "Vận động viên tự do",
              bold: true,
              fontSize: 8.5,
              margin: [0, 3, 0, 0],
              border: [false, false, false, true],
              borderColor: ["#ffffff", "#ffffff", "#ffffff", theme.secondary],
            },
          ],
          [
            {
              text: "Quốc gia:",
              bold: true,
              fontSize: 8,
              margin: [0, 3, 0, 0],
              border: [false, false, false, false],
            },
            {
              text: ticket.athlete.country?.name || "—",
              fontSize: 8,
              margin: [0, 3, 0, 0],
              border: [false, false, false, true],
              borderColor: ["#ffffff", "#ffffff", "#ffffff", theme.secondary],
            },
          ],
        ],
      },
      layout: {
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      fillColor: "#ffffff",
    };

    const footer: Content = {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                {
                  text: `${this.date(ticket.event.startDate)}${ticket.event.location ? ` · ${ticket.event.location}` : ""}`,
                  alignment: "center",
                  color: "#ffffff",
                  bold: true,
                  fontSize: 7,
                },
                {
                  text: `${ticket.ticketCode}  •  SPORTDATA.VN`,
                  alignment: "center",
                  color: "#e2e8f0",
                  bold: true,
                  fontSize: 6.5,
                  characterSpacing: 0.5,
                  margin: [0, 3, 0, 0],
                },
              ],
              margin: [6, 7, 6, 7],
              fillColor: theme.secondary,
            },
          ],
        ],
      },
      layout: "noBorders",
    };

    const classicHeader: Content = {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                {
                  columns: [
                    {
                      text: "SPORTDATA VIỆT NAM",
                      bold: true,
                      color: theme.primary,
                      fontSize: 8,
                      characterSpacing: 1.2,
                    },
                    {
                      text: status.label,
                      alignment: "right",
                      bold: true,
                      color: status.color,
                      fontSize: 6.5,
                    },
                  ],
                },
                {
                  text: ticket.event.name.toLocaleUpperCase("vi"),
                  alignment: "center",
                  bold: true,
                  color: theme.secondary,
                  fontSize: 15,
                  margin: [4, 8, 4, 0],
                },
                {
                  text: (ticket.sport?.name || "GIẢI ĐẤU THỂ THAO").toLocaleUpperCase("vi"),
                  alignment: "center",
                  bold: true,
                  fontSize: 7,
                  characterSpacing: 1,
                  margin: [0, 4, 0, 1],
                },
              ],
              margin: [9, 7, 9, 7],
              fillColor: "#ffffff",
            },
          ],
        ],
      },
      layout: "noBorders",
    };

    const media: Content = {
      columns: [
        { width: 105, stack: [photo] },
        { width: "*", stack: [qrAndCategory] },
      ],
      columnGap: 18,
    };

    const athleteTitle: Content = {
      table: {
        widths: ["*"],
        body: [
          [
            {
              text: "VẬN ĐỘNG VIÊN",
              alignment: "center",
              bold: true,
              color: theme.primary,
              fontSize: 20,
              characterSpacing: 1,
              margin: [4, 5, 4, 5],
              fillColor: "#ffffff",
            },
          ],
        ],
      },
      layout: "noBorders",
    };

    if (theme.layout === "STRIPE") {
      const stripeHeader: Content = {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      {
                        text: "SPORTDATA VIỆT NAM",
                        bold: true,
                        color: "#ffffff",
                        fontSize: 8,
                        characterSpacing: 1.2,
                      },
                      {
                        text: status.label,
                        alignment: "right",
                        bold: true,
                        color: "#ffffff",
                        fontSize: 6.5,
                      },
                    ],
                  },
                  {
                    text: ticket.event.name.toLocaleUpperCase("vi"),
                    alignment: "center",
                    bold: true,
                    color: "#ffffff",
                    fontSize: 15,
                    margin: [4, 8, 4, 0],
                  },
                  {
                    text: (ticket.sport?.name || "GIẢI ĐẤU THỂ THAO").toLocaleUpperCase("vi"),
                    alignment: "center",
                    bold: true,
                    color: "#e2e8f0",
                    fontSize: 7,
                    characterSpacing: 1,
                    margin: [0, 4, 0, 1],
                  },
                ],
                margin: [9, 9, 9, 9],
                fillColor: theme.secondary,
              },
            ],
          ],
        },
        layout: "noBorders",
      };

      return [
        ...backgroundLayer,
        { ...stripeHeader, margin: [0, 0, 0, 8] },
        { ...media, margin: [18, 0, 18, 7] },
        { ...athleteTitle, margin: [0, 0, 0, 6] },
        { ...details, margin: [8, 0, 8, 6] },
        { ...footer, margin: [0, 10, 0, 0] },
      ];
    }

    if (theme.layout === "MINIMAL") {
      const minimalHeader: Content = {
        table: {
          widths: [5, "*"],
          body: [
            [
              { text: "", fillColor: theme.accent },
              {
                stack: [
                  {
                    columns: [
                      {
                        text: "SPORTDATA VIỆT NAM",
                        bold: true,
                        color: theme.primary,
                        fontSize: 7.5,
                        characterSpacing: 1.1,
                      },
                      {
                        text: status.label,
                        alignment: "right",
                        bold: true,
                        color: status.color,
                        fontSize: 6.3,
                      },
                    ],
                  },
                  {
                    text: ticket.event.name.toLocaleUpperCase("vi"),
                    bold: true,
                    color: theme.secondary,
                    fontSize: 14,
                    margin: [0, 6, 0, 0],
                  },
                  {
                    text: (ticket.sport?.name || "GIẢI ĐẤU THỂ THAO").toLocaleUpperCase("vi"),
                    bold: true,
                    color: "#475569",
                    fontSize: 6.5,
                    characterSpacing: 1,
                    margin: [0, 3, 0, 0],
                  },
                ],
                fillColor: "#ffffff",
                margin: [9, 7, 9, 7],
              },
            ],
          ],
        },
        layout: "noBorders",
      };

      const minimalMedia: Content = {
        columns: [
          { width: 105, stack: [photo] },
          {
            width: "*",
            stack: [
              {
                text: "VẬN ĐỘNG\nVIÊN",
                alignment: "center",
                bold: true,
                color: theme.primary,
                fontSize: 16,
                lineHeight: 0.9,
                margin: [0, 2, 0, 8],
              },
              qrAndCategory,
            ],
          },
        ],
        columnGap: 18,
      };

      const minimalFooter: Content = {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    text: `${this.date(ticket.event.startDate)}${ticket.event.location ? ` · ${ticket.event.location}` : ""}`,
                    alignment: "center",
                    color: theme.secondary,
                    bold: true,
                    fontSize: 7,
                  },
                  {
                    text: ticket.ticketCode,
                    alignment: "center",
                    color: theme.primary,
                    bold: true,
                    fontSize: 6.5,
                    characterSpacing: 0.5,
                    margin: [0, 3, 0, 0],
                  },
                ],
                margin: [6, 6, 6, 6],
                fillColor: "#ffffff",
              },
            ],
          ],
        },
        layout: {
          hLineColor: () => theme.primary,
          vLineColor: () => "#ffffff",
          hLineWidth: (index: number) => (index === 0 ? 1 : 0),
          vLineWidth: () => 0,
        },
      };

      return [
        ...backgroundLayer,
        { ...minimalHeader, margin: [0, 0, 0, 11] },
        { ...minimalMedia, margin: [18, 0, 18, 9] },
        { ...details, margin: [8, 0, 8, 6] },
        { ...minimalFooter, margin: [0, 17, 0, 0] },
      ];
    }

    return [
      ...backgroundLayer,
      { ...classicHeader, margin: [0, 0, 0, 9] },
      { ...media, margin: [18, 0, 18, 7] },
      { ...athleteTitle, margin: [0, 0, 0, 6] },
      { ...details, margin: [8, 0, 8, 6] },
      { ...footer, margin: [0, 18, 0, 0] },
    ];
  }

  private ticketTheme(ticket: TicketPayload) {
    const validHex = /^#[0-9a-f]{6}$/i;
    const pick = (value: string | null | undefined, fallback: string) =>
      validHex.test(value || "") ? value! : fallback;
    const layout = ["CLASSIC", "STRIPE", "MINIMAL"].includes(
      ticket.event.ticketLayout || "",
    )
      ? ticket.event.ticketLayout!
      : "CLASSIC";

    return {
      layout,
      primary: pick(ticket.event.ticketPrimaryColor, "#0284C7"),
      secondary: pick(ticket.event.ticketSecondaryColor, "#075985"),
      accent: pick(ticket.event.ticketAccentColor, "#059669"),
    };
  }

  private dataUrl(data?: Buffer | null, mimeType?: string | null) {
    if (!data || !mimeType || !["image/jpeg", "image/png"].includes(mimeType))
      return null;
    return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`;
  }

  private status(value: string, isValid?: boolean, paymentStatus?: string) {
    if (value === "CONFIRMED" && isValid)
      return { label: "VÉ HỢP LỆ", color: "#047857", background: "#ecfdf5" };
    if (paymentStatus === "PENDING")
      return { label: "CHỜ THANH TOÁN", color: "#b45309", background: "#fffbeb" };
    if (value === "REJECTED")
      return { label: "KHÔNG HỢP LỆ", color: "#b91c1c", background: "#fef2f2" };
    if (value === "CANCELLED")
      return { label: "ĐÃ HỦY", color: "#475569", background: "#f1f5f9" };
    return { label: "CHỜ XÁC NHẬN", color: "#92400e", background: "#fffbeb" };
  }

  private date(value: Date | string) {
    return new Date(value).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  }
}
