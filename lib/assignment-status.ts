import type { AssetAssignment } from '@/lib/types';

/** Display-only relabeling — the underlying AssignmentStatus enum stays ACTIVE/RETURN_PENDING/
 *  RETURNED; only the text shown to users changes ("In Use" reads clearer than the raw enum). */
export const ASSIGNMENT_STATUS_LABELS: Record<AssetAssignment['status'], string> = {
  ACTIVE: 'In Use',
  RETURN_PENDING: 'Return Pending',
  RETURNED: 'Returned',
};

export const ASSIGNMENT_STATUS_TONE: Record<AssetAssignment['status'], 'blue' | 'amber' | 'neutral'> = {
  ACTIVE: 'blue',
  RETURN_PENDING: 'amber',
  RETURNED: 'neutral',
};
