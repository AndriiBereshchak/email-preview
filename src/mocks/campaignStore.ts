import {
  countAudience,
  traderFiltersProblem,
  partnerFiltersProblem,
  versionReach,
  EMPTY_TRADER_FILTERS,
  EMPTY_PARTNER_FILTERS,
  type CampaignTarget,
  type TraderFilterState,
  type PartnerFilterState,
} from '../utils/audienceModel';
import type { LetterDraft, LetterLocale } from '../utils/localModel';

export interface Numbers {
  total: number;
  queued: number;
  sent: number;
  cancelled: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  complained: number;
}

export interface LaunchInput {
  key: string;
  target: CampaignTarget;
  filters: TraderFilterState | PartnerFilterState;
  letters: LetterDraft[];
  defaultLocale: LetterLocale;
  expectedRecipients: number;
  everyoneConfirmed: boolean;
  skipUnengaged?: boolean;
}

export interface Campaign {
  id: number;
  key: string;
  target: CampaignTarget;
  subject: string;
  phase: 'sending' | 'done' | 'cancelled';
  createdAt: string;
  expectedRecipients: number;
  skipUnengaged: boolean;
  skipped: number;
  defaultLocale: LetterLocale;
  letters: LetterDraft[];
  audience: { filters: LaunchInput['filters']; everyone: boolean };
  versions: { locale: LetterLocale; numbers: Numbers }[];
  numbers: Numbers;
}

const emptyNumbers = (total: number): Numbers => ({
  total,
  queued: total,
  sent: 0,
  cancelled: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  unsubscribed: 0,
  bounced: 0,
  complained: 0,
});

const totalNumbers = (versions: Campaign['versions']) =>
  versions.reduce((sum, version) => {
    for (const key of Object.keys(sum) as (keyof Numbers)[])
      sum[key] += version.numbers[key];
    return sum;
  }, emptyNumbers(0));

export function createCampaignStore() {
  let campaigns: readonly Campaign[] = [];
  let nextId = 1;
  const listeners = new Set<() => void>();
  const publish = (next: readonly Campaign[]) => {
    campaigns = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => campaigns,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start(input: LaunchInput) {
      const existing = campaigns.find((item) => item.key === input.key);
      if (existing) return existing.id;
      const problem =
        input.target === 'TRADER'
          ? traderFiltersProblem(input.filters as TraderFilterState)
          : partnerFiltersProblem(input.filters as PartnerFilterState);
      const audience = countAudience(input.target, input.filters);
      if (
        problem ||
        !audience.count ||
        audience.count !== input.expectedRecipients
      )
        throw new Error(problem || 'Проверьте число получателей ещё раз');
      if (
        !input.letters.length ||
        !input.letters.some(
          (letter) => letter.locale === input.defaultLocale,
        ) ||
        new Set(input.letters.map((letter) => letter.locale)).size !==
          input.letters.length ||
        input.letters.some(
          (letter) => !letter.subject.trim() || !letter.html.trim(),
        )
      )
        throw new Error('Проверьте все языковые версии письма');
      if (audience.everyone && !input.everyoneConfirmed)
        throw new Error('Подтвердите отправку всей аудитории');
      const sendingAudience = countAudience(
        input.target,
        input.filters,
        input.skipUnengaged ?? false,
      );
      const versions = versionReach(
        sendingAudience.byLanguage,
        input.letters.map((letter) => letter.locale),
        input.defaultLocale,
      ).map((row) => ({
        locale: row.locale as LetterLocale,
        numbers: emptyNumbers(row.total),
      }));
      const campaign: Campaign = {
        id: nextId++,
        key: input.key,
        target: input.target,
        subject: input.letters.find(
          (letter) => letter.locale === input.defaultLocale,
        )!.subject,
        phase: sendingAudience.count ? 'sending' : 'done',
        createdAt: new Date().toISOString(),
        expectedRecipients: input.expectedRecipients,
        skipUnengaged: input.skipUnengaged ?? false,
        skipped: sendingAudience.skipped,
        defaultLocale: input.defaultLocale,
        letters: structuredClone(input.letters),
        audience: {
          filters: structuredClone(input.filters),
          everyone: audience.everyone,
        },
        versions,
        numbers: totalNumbers(versions),
      };
      publish([campaign, ...campaigns]);
      return campaign.id;
    },
    advance() {
      if (!campaigns.some((item) => item.phase === 'sending')) return;
      publish(
        campaigns.map((item) => {
          if (item.phase !== 'sending') return item;
          const versions = item.versions.map((version) => {
            const n = version.numbers;
            const sent =
              n.sent + Math.min(n.queued, Math.max(1, Math.ceil(n.total / 20)));
            return {
              ...version,
              numbers: {
                ...n,
                sent,
                queued: n.total - sent,
                delivered: sent,
                opened: Math.floor(sent / 2),
                clicked: Math.floor(sent / 5),
              },
            };
          });
          const numbers = totalNumbers(versions);
          return {
            ...item,
            versions,
            numbers,
            phase: numbers.queued ? ('sending' as const) : ('done' as const),
          };
        }),
      );
    },
    stop(id: number) {
      if (!campaigns.some((item) => item.id === id && item.phase === 'sending'))
        return;
      publish(
        campaigns.map((item) => {
          if (item.id !== id || item.phase !== 'sending') return item;
          const versions = item.versions.map((version) => ({
            ...version,
            numbers: {
              ...version.numbers,
              cancelled: version.numbers.queued,
              queued: 0,
            },
          }));
          return {
            ...item,
            phase: 'cancelled',
            versions,
            numbers: totalNumbers(versions),
          };
        }),
      );
    },
  };
}
export const campaignStore = createCampaignStore();
for (const target of ['TRADER', 'PARTNER'] as const) {
  const filters =
    target === 'TRADER' ? EMPTY_TRADER_FILTERS : EMPTY_PARTNER_FILTERS;
  const id = campaignStore.start({
    key: `example-${target}`,
    target,
    filters,
    letters: [
      {
        locale: 'ru',
        subject:
          target === 'TRADER' ? 'Новости платформы' : 'Новости для партнёров',
        preheader: 'Последние обновления',
        html: '<h2>Здравствуйте!</h2><p>Рассказываем о последних обновлениях платформы.</p>',
      },
    ],
    defaultLocale: 'ru',
    expectedRecipients: countAudience(target, filters).count,
    everyoneConfirmed: true,
  });
  if (target === 'TRADER')
    for (let tick = 0; tick < 30; tick++) campaignStore.advance();
  else {
    campaignStore.advance();
    campaignStore.stop(id);
  }
}
