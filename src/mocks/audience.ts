import type { CampaignTarget } from '../utils/audienceModel';

// Fixed API-response examples for the demo; filters are not evaluated locally.
export const DEMO_AUDIENCE: Record<
  CampaignTarget,
  {
    count: number;
    everyone: boolean;
    byLanguage: Array<{ locale: string; count: number }>;
  }
> = {
  TRADER: {
    count: 24,
    everyone: true,
    byLanguage: [
      { locale: 'ru', count: 9 },
      { locale: 'uk', count: 8 },
      { locale: 'en', count: 7 },
    ],
  },
  PARTNER: {
    count: 9,
    everyone: true,
    byLanguage: [
      { locale: 'ru', count: 3 },
      { locale: 'uk', count: 3 },
      { locale: 'en', count: 3 },
    ],
  },
};
