import type { Campaign, Numbers } from '../mocks/campaigns';
export const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('ru-RU');
export const percent = (value: number, total: number) =>
  total ? `${Math.round((value / total) * 100)}%` : '—';
export const phaseView = (
  campaign: Pick<CampaignSummary, 'phase' | 'numbers'>,
) => ({
  label:
    campaign.phase === 'done'
      ? 'Завершена'
      : campaign.phase === 'cancelled'
        ? 'Остановлена'
        : 'Отправляется',
  tone:
    campaign.phase === 'done'
      ? ('ok' as const)
      : campaign.phase === 'cancelled'
        ? ('muted' as const)
        : ('info' as const),
  progress:
    campaign.phase === 'sending'
      ? campaign.numbers?.total
        ? campaign.numbers.sent / campaign.numbers.total
        : 0
      : null,
  hint:
    campaign.phase === 'cancelled'
      ? `Не отправлено: ${campaign.numbers?.cancelled ?? 0}`
      : '',
});
export type PhaseView = ReturnType<typeof phaseView>;
export type Tone = PhaseView['tone'];

export interface CampaignSummary {
  id: number;
  kind: 'campaign' | 'legacy';
  target: Campaign['target'];
  subject: string;
  phase: Campaign['phase'];
  status: string;
  createdAt: string;
  startedAt: string | null;
  createdByName: string | null;
  locales: string[];
  defaultLocale: string;
  expectedRecipients: number | null;
  enqueued: number;
  numbers: (Numbers & { failed?: number; suppressed?: number }) | null;
  statsFromSnapshot: boolean;
  statsCapturedAt: string | null;
  lastError: string | null;
}

export function campaignSummary(campaign: Campaign): CampaignSummary {
  return {
    id: campaign.id,
    kind: 'campaign',
    target: campaign.target,
    subject: campaign.subject,
    phase: campaign.phase,
    status:
      campaign.phase === 'done'
        ? 'COMPLETED'
        : campaign.phase === 'cancelled'
          ? 'CANCELLED'
          : 'SENDING',
    createdAt: campaign.createdAt,
    startedAt: campaign.createdAt,
    createdByName: null,
    locales: campaign.letters.map((letter) => letter.locale),
    defaultLocale: campaign.defaultLocale,
    expectedRecipients: campaign.expectedRecipients,
    enqueued: campaign.numbers.total,
    numbers: campaign.numbers,
    statsFromSnapshot: false,
    statsCapturedAt: null,
    lastError: null,
  };
}
