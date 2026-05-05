import type { View } from '@/types';

export interface Route {
  id: View;
  label: string;
  icon: string;
}

export const ROUTES: Route[] = [
  { id: 'dashboard', label: 'Home', icon: 'Home' },
  { id: 'start-debate', label: 'Start Debate', icon: 'Swords' },
  { id: 'history', label: 'History', icon: 'History' },
  { id: 'performance', label: 'Performance', icon: 'BarChart2' },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: 'Library' },
];
