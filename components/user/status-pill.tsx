import { PresenceIndicator } from '@/components/user/presence-indicator';

type Status = 'online' | 'away' | 'offline';

const STATUS_LABEL: Record<Status, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
};

const STATUS_PILL_STYLE: Record<Status, { background: string; color: string; border: string }> = {
  online: {
    background: 'rgba(46, 125, 91, 0.08)',
    color: '#2E7D5B',
    border: '1px solid rgba(46, 125, 91, 0.2)',
  },
  away: {
    background: 'rgba(217, 119, 6, 0.08)',
    color: '#B45309',
    border: '1px solid rgba(217, 119, 6, 0.2)',
  },
  offline: {
    background: 'rgba(232, 226, 222, 0.6)',
    color: '#777174',
    border: '1px solid #E8E2DE',
  },
};

interface StatusPillProps {
  status: Status;
}

export function StatusPill({ status }: StatusPillProps) {
  const s = STATUS_PILL_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium transition-colors"
      style={{ background: s.background, color: s.color, border: s.border }}
    >
      <PresenceIndicator status={status} className="!h-2 !w-2 !ring-0" />
      {STATUS_LABEL[status]}
    </span>
  );
}
