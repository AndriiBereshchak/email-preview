import type { Campaign } from './campaignStore';
export const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('ru-RU');
export const percent = (value: number, total: number) =>
  total ? `${Math.round((value / total) * 100)}%` : '—';
export const phaseView = (campaign: Campaign) => ({
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
      ? campaign.numbers.sent / campaign.numbers.total
      : null,
  hint:
    campaign.phase === 'cancelled'
      ? `Не отправлено: ${campaign.numbers.cancelled}`
      : '',
});
export type PhaseView = ReturnType<typeof phaseView>;
export type Tone = PhaseView['tone'];
