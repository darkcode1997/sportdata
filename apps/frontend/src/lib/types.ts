export enum UserRole {
  ADMIN = 'ADMIN',
  CONTENT = 'CONTENT',
  GAMES_ADMIN = 'GAMES_ADMIN',
  READ_ONLY = 'READ_ONLY',
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum WinMethod {
  DECISION = 'DECISION',
  KO = 'KO',
  TKO = 'TKO',
  SUBMISSION = 'SUBMISSION',
  IPPON = 'IPPON',
  DISQUALIFICATION = 'DISQUALIFICATION',
  WITHDRAWAL = 'WITHDRAWAL',
  POINTS = 'POINTS',
}

export enum MatchType {
  ELIMINATION = 'ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN',
  SEMI_FINAL = 'SEMI_FINAL',
  FINAL = 'FINAL',
  QUARTER_FINAL = 'QUARTER_FINAL',
  PRELIMINARY = 'PRELIMINARY',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  MIXED = 'MIXED',
}

export interface Country {
  id: string;
  code: string;
  name: string;
  flagUrl?: string;
}

export interface Federation {
  id: string;
  name: string;
  logoUrl?: string;
  countryId?: string;
  country?: Country;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  gender: Gender;
  minAge?: number;
  maxAge?: number;
  minWeight?: number;
  maxWeight?: number;
  sportId: string;
  sport?: Sport;
  divisionId?: string;
}

export interface Division {
  id: string;
  name: string;
  sportId: string;
  categories?: Category[];
}

export interface Sport {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  bannerColor?: string;
  description?: string;
  federationId?: string;
  federation?: Federation;
  divisions?: Division[];
  categories?: Category[];
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  bannerUrl?: string;
  logoUrl?: string;
  sportId: string;
  sport?: Sport;
  categories?: Category[];
  matches?: Match[];
  status: MatchStatus;
}

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender: Gender;
  photoUrl?: string;
  countryId: string;
  country?: Country;
  federationId?: string;
  federation?: Federation;
  categories?: Category[];
  weight?: number;
  height?: number;
  rankingPoints?: number;
  goldMedals?: number;
  silverMedals?: number;
  bronzeMedals?: number;
}

export interface Match {
  id: string;
  matchNumber: number;
  matchType: MatchType;
  status: MatchStatus;
  startTime: Date;
  endTime?: Date;
  fop?: string;
  eventId: string;
  event?: Event;
  categoryId: string;
  category?: Category;
  sportId: string;
  sport?: Sport;
  athlete1Id: string;
  athlete1?: Athlete;
  athlete2Id: string;
  athlete2?: Athlete;
  athlete1Score?: number;
  athlete2Score?: number;
  winnerId?: string;
  winner?: Athlete;
  winMethod?: WinMethod;
  round?: number;
  athlete1Advantages?: number;
  athlete2Advantages?: number;
  athlete1Penalties?: number;
  athlete2Penalties?: number;
}

export interface Statistic {
  id: string;
  athleteId: string;
  athlete?: Athlete;
  sportId: string;
  sport?: Sport;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
  totalPoints: number;
  winRate?: number;
}
