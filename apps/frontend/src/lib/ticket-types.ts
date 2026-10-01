export type TicketStatus = 'SUBMITTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export type TicketStatistics = {
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalMatches: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
};

export type ParticipationTicket = {
  ticketCode: string;
  status: TicketStatus | string;
  paymentStatus?: string;
  isValid?: boolean;
  issuedAt?: string;
  event: {
    id?: string;
    name: string;
    startDate: string;
    endDate?: string;
    location?: string | null;
    logoUrl?: string | null;
  };
  sport?: {
    id?: string;
    code?: string;
    name: string;
  } | null;
  category: {
    id?: string;
    name: string;
    gender?: string;
    discipline?: string | null;
    uniform?: string | null;
    beltLevel?: string | null;
    minAge?: number | null;
    maxAge?: number | null;
    minWeight?: number | null;
    maxWeight?: number | null;
  };
  athlete: {
    id?: string;
    fullName: string;
    birthDate?: string | null;
    gender?: string;
    weight?: number | null;
    avatarUrl?: string | null;
    country?: { code?: string; name?: string } | null;
    federation?: { name?: string } | null;
  };
  achievements?: {
    event?: TicketStatistics;
    career?: TicketStatistics;
  };
};
