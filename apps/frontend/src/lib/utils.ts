import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MatchStatus, MatchType, WinMethod, Gender } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: Date | string | null | undefined,
  format?: string | null,
): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  if (!format) {
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  const monthsEN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthsVI = ["Thg1","Thg2","Thg3","Thg4","Thg5","Thg6","Thg7","Thg8","Thg9","Thg10","Thg11","Thg12"];
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const MMM = monthsEN[d.getMonth()];
  const TTT = monthsVI[d.getMonth()];
  const dd = String(d.getDate()).padStart(2, "0");
  const d_single = String(d.getDate());
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const weekdaysEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdaysVI = ["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"];
  const EEE = weekdaysEN[d.getDay()];
  const eee = weekdaysVI[d.getDay()];
  return String(format)
    .replace(/yyyy/g, String(yyyy))
    .replace(/TTT/g, TTT)
    .replace(/MMM/g, MMM)
    .replace(/MM/g, MM)
    .replace(/dd/g, dd)
    .replace(/\bd\b/g, d_single)
    .replace(/HH/g, HH)
    .replace(/mm/g, mm)
    .replace(/ss/g, ss)
    .replace(/EEE/g, EEE)
    .replace(/eee/g, eee);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const raw = String(date).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) return raw;
  const d = new Date(date);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusLabel(status: MatchStatus): string {
  switch (status) {
    case MatchStatus.SCHEDULED:
      return "Lịch";
    case MatchStatus.RUNNING:
      return "Đang thi đấu";
    case MatchStatus.FINISHED:
      return "Hoàn thành";
    case MatchStatus.CANCELLED:
      return "Hủy";
    default:
      return status;
  }
}

export function getStatusBgColor(status: MatchStatus): string {
  switch (status) {
    case MatchStatus.SCHEDULED:
      return "bg-blue-500";
    case MatchStatus.RUNNING:
      return "bg-green-500";
    case MatchStatus.FINISHED:
      return "bg-gray-500";
    case MatchStatus.CANCELLED:
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

export function getStatusTextColor(status: MatchStatus): string {
  switch (status) {
    case MatchStatus.SCHEDULED:
      return "text-blue-400";
    case MatchStatus.RUNNING:
      return "text-green-400";
    case MatchStatus.FINISHED:
      return "text-gray-400";
    case MatchStatus.CANCELLED:
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function getMatchTypeLabel(type: MatchType): string {
  switch (type) {
    case MatchType.ELIMINATION:
      return "Loại trực tiếp";
    case MatchType.ROUND_ROBIN:
      return "Vòng tròn";
    case MatchType.SEMI_FINAL:
      return "Bán kết";
    case MatchType.FINAL:
      return "Chung kết";
    case MatchType.QUARTER_FINAL:
      return "Tứ kết";
    case MatchType.PRELIMINARY:
      return "Vòng loại";
    default:
      return type;
  }
}

export function getWinMethodLabel(
  method: WinMethod | undefined | null,
): string {
  if (!method) return "-";
  switch (method) {
    case WinMethod.DECISION:
      return "Quyết định trọng tài";
    case WinMethod.KO:
      return "KO";
    case WinMethod.TKO:
      return "TKO";
    case WinMethod.SUBMISSION:
      return "Đầu hàng";
    case WinMethod.IPPON:
      return "Ippon";
    case WinMethod.DISQUALIFICATION:
      return "Bị loại";
    case WinMethod.WITHDRAWAL:
      return "Rút cuộc";
    case WinMethod.POINTS:
      return "Điểm";
    default:
      return method;
  }
}

export function getGenderLabel(gender: Gender): string {
  switch (gender) {
    case Gender.MALE:
      return "Nam";
    case Gender.FEMALE:
      return "Nữ";
    case Gender.MIXED:
      return "Hỗn hợp";
    default:
      return gender;
  }
}

export function generateMatchTitle(matchNumber: number): string {
  return `Trận #${matchNumber}`;
}

export function calculateAge(
  birthDate: Date | string | null | undefined,
): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const mDiff = today.getMonth() - birth.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age < 0 ? 0 : age;
}

export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate?: Date | string | null | undefined,
): string {
  if (!startDate) return "";
  const start = new Date(startDate);
  const fmt = function (d: Date) {
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };
  if (!endDate) return fmt(start);
  const end = new Date(endDate);
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    return fmt(start);
  }
  if (start.getFullYear() === end.getFullYear()) {
    return (
      start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
      " - " +
      fmt(end)
    );
  }
  return fmt(start) + " - " + fmt(end);
}

export function getMedalColor(
  type: "gold" | "silver" | "bronze" | string,
): string {
  const t = String(type || "").toLowerCase();
  switch (t) {
    case "gold":
      return "from-yellow-400 to-amber-500 text-yellow-400";
    case "silver":
      return "from-slate-300 to-slate-400 text-slate-300";
    case "bronze":
      return "from-amber-700 to-amber-900 text-amber-700";
    default:
      return "from-slate-500 to-slate-600 text-slate-400";
  }
}

export function getStatusColor(status: MatchStatus | string): string {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "SCHEDULED":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "RUNNING":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "FINISHED":
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    case "CANCELLED":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}
