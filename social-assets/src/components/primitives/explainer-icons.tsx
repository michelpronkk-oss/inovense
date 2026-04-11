import type { CSSProperties } from 'react';
import {
  Bell,
  ChartColumn,
  Circle,
  ClipboardCheck,
  Code,
  Compass,
  Database,
  Gauge,
  Inbox,
  LayoutTemplate,
  MessageSquare,
  MousePointerClick,
  PenTool,
  Rocket,
  Route,
  Target,
  Workflow,
  Bot,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { brand } from '../../tokens/brand';

export type ExplainerIconKey =
  | 'strategy'
  | 'structure'
  | 'design'
  | 'build'
  | 'launch'
  | 'capture'
  | 'route'
  | 'automate'
  | 'notify'
  | 'review'
  | 'traffic'
  | 'landing'
  | 'crm'
  | 'follow_up'
  | 'report'
  | 'system'
  | 'optimize';

const ICON_MAP: Record<ExplainerIconKey, LucideIcon> = {
  strategy: Compass,
  structure: LayoutTemplate,
  design: PenTool,
  build: Code,
  launch: Rocket,
  capture: Inbox,
  route: Route,
  automate: Bot,
  notify: Bell,
  review: ClipboardCheck,
  traffic: Gauge,
  landing: MousePointerClick,
  crm: Database,
  follow_up: MessageSquare,
  report: ChartColumn,
  system: Workflow,
  optimize: Target,
};

type ExplainerIconProps = {
  icon: ExplainerIconKey;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
};

export function ExplainerIcon({
  icon,
  size = 18,
  strokeWidth = 1.8,
  color = brand.teal,
  style,
}: ExplainerIconProps) {
  const Icon = ICON_MAP[icon] ?? Circle;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      style={{ flexShrink: 0, ...style }}
    />
  );
}

