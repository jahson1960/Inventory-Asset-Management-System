export type BadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

const TONES: Record<string, BadgeTone> = {
  PENDING: 'amber',
  APPROVED: 'blue',
  REJECTED: 'red',
  CANCELLED: 'neutral',
  FULFILLED: 'green',
  COMPLETED: 'green',
  ACTIVE: 'blue',
  RETURNED: 'neutral',
};

export function statusTone(status: string): BadgeTone {
  return TONES[status] ?? 'neutral';
}
