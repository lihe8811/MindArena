import type { View } from '@/shared/types';

export interface Route {
  id: View;
  label: string;
  icon: string;
}

export const ROUTES: Route[] = [
  { id: 'dashboard', label: 'Home', icon: 'Home' },
  { id: 'start-debate', label: 'Start Debate', icon: 'CirclePlay' },
  { id: 'history', label: 'History', icon: 'History' },
  { id: 'performance', label: 'Performance', icon: 'BarChart2' },
];
