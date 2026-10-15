import {
  EMPTY_PARTNER_FILTERS,
  EMPTY_TRADER_FILTERS,
  type CampaignTarget,
  type PartnerFilterState,
  type TraderFilterState,
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

export interface Campaign {
  id: number;
  target: CampaignTarget;
  subject: string;
  phase: 'sending' | 'done' | 'cancelled';
  createdAt: string;
  expectedRecipients: number;
  skipUnengaged: boolean;
  skipped: number;
  defaultLocale: LetterLocale;
  letters: LetterDraft[];
  audience: {
    filters: TraderFilterState | PartnerFilterState;
    everyone: boolean;
  };
  versions: { locale: LetterLocale; numbers: Numbers }[];
  numbers: Numbers;
}

// Static examples only. No creation, queue advancement, cancellation or statistics simulation.
export const CAMPAIGNS: readonly Campaign[] = [
  {
    id: 2,
    target: 'PARTNER',
    subject: 'Новости для партнёров',
    phase: 'cancelled',
    createdAt: '2026-10-10T10:00:00.000Z',
    expectedRecipients: 9,
    skipUnengaged: false,
    skipped: 0,
    defaultLocale: 'ru',
    letters: [
      {
        locale: 'ru',
        subject: 'Новости для партнёров',
        preheader: 'Последние обновления',
        html: '<h2>Здравствуйте!</h2><p>Рассказываем о последних обновлениях платформы.</p>',
      },
    ],
    audience: { filters: EMPTY_PARTNER_FILTERS, everyone: true },
    versions: [
      {
        locale: 'ru',
        numbers: {
          total: 9,
          queued: 0,
          sent: 1,
          cancelled: 8,
          delivered: 1,
          opened: 0,
          clicked: 0,
          unsubscribed: 0,
          bounced: 0,
          complained: 0,
        },
      },
    ],
    numbers: {
      total: 9,
      queued: 0,
      sent: 1,
      cancelled: 8,
      delivered: 1,
      opened: 0,
      clicked: 0,
      unsubscribed: 0,
      bounced: 0,
      complained: 0,
    },
  },
  {
    id: 1,
    target: 'TRADER',
    subject: 'Новости платформы',
    phase: 'done',
    createdAt: '2026-10-01T10:00:00.000Z',
    expectedRecipients: 24,
    skipUnengaged: false,
    skipped: 0,
    defaultLocale: 'ru',
    letters: [
      {
        locale: 'ru',
        subject: 'Новости платформы',
        preheader: 'Последние обновления',
        html: '<h2>Здравствуйте!</h2><p>Рассказываем о последних обновлениях платформы.</p>',
      },
    ],
    audience: { filters: EMPTY_TRADER_FILTERS, everyone: true },
    versions: [
      {
        locale: 'ru',
        numbers: {
          total: 24,
          queued: 0,
          sent: 24,
          cancelled: 0,
          delivered: 24,
          opened: 12,
          clicked: 4,
          unsubscribed: 0,
          bounced: 0,
          complained: 0,
        },
      },
    ],
    numbers: {
      total: 24,
      queued: 0,
      sent: 24,
      cancelled: 0,
      delivered: 24,
      opened: 12,
      clicked: 4,
      unsubscribed: 0,
      bounced: 0,
      complained: 0,
    },
  },
];
