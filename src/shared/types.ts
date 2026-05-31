export type View =
  | 'landing'
  | 'dashboard'
  | 'start-debate'
  | 'arena'
  | 'history'
  | 'performance';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  streak: number;
  createdAt?: string;
}

export interface AuthSession {
  authenticated: boolean;
  user: UserProfile | null;
  token: string | null;
}

export interface AuthResponse {
  session: AuthSession;
}

export interface DashboardStats {
  logicScore: number;
  averageResponseSeconds: number;
  winRate: number;
  debatesCompleted: number;
}

export interface RecentDebate {
  id: string;
  topic: string;
  opponent: string;
  status: 'Victory' | 'Defeat' | 'Draw' | 'In Progress';
  duration: string;
  tokens: string;
  domain: string;
}

export interface DashboardData {
  heroTitle: string;
  heroSubtitle: string;
  stats: DashboardStats;
  recentDebates: RecentDebate[];
  recommendations: string[];
}

export interface DebateSetup {
  topic: string;
  stance: 'Proponent' | 'Opponent';
  speakerRole?: DebateParticipantId;
  rigor: number;
}

export interface DebateMessage {
  id: string;
  role: 'system' | 'user';
  author: string;
  time: string;
  content: string;
}

export type DebateParticipantId = 'pro1' | 'pro2' | 'con1' | 'con2';

export interface DebateParticipant {
  id: DebateParticipantId;
  label: DebateParticipantId;
  side: 'Proponent' | 'Opponent';
  speakerOrder: 1 | 2;
}

export interface ActiveDebate {
  id: string;
  topic: string;
  stance: 'Proponent' | 'Opponent';
  speakerRole?: DebateParticipantId;
  rigor: number;
  stage: string;
  timerLabel: string;
  status: 'Ready' | 'In Progress' | 'Completed';
  messages: DebateMessage[];
  createdAt: string;
  updatedAt: string;
  score?: number;
  participants?: DebateParticipant[];
}

export interface HistoryItem {
  id: string;
  topic: string;
  subject: string;
  date: string;
  level: number;
  status: 'Victory' | 'Defeat' | 'Draw' | 'In Progress';
  score: number;
  opponent?: string;
  createdAt?: string;
}

export interface PerformanceMetric {
  label: string;
  value: string;
  trend: string;
  isDown?: boolean;
}

export interface PerformanceData {
  highlights: PerformanceMetric[];
  skillBalance: Array<{ label: string; value: number }>;
  insight: string;
  recommendation: string;
  milestoneProgress: number;
}

export interface AppBootstrap {
  session: AuthSession;
  dashboard: DashboardData;
  history: HistoryItem[];
  performance: PerformanceData;
  activeDebate: ActiveDebate | null;
}
