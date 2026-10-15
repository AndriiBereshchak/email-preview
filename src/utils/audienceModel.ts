import {
  LETTER_LANGUAGES,
  type LetterLocale,
  type VersionReach,
} from './localModel';
export { formatCount, languageName } from './localModel';
export { languagesWord } from './copy';

export type CampaignTarget = 'TRADER' | 'PARTNER';
export interface Option<T extends string = string> {
  value: T;
  label: string;
}
export interface RangePreset {
  label: string;
  range: (now?: Date) => { from: string; to: string };
}
export interface TraderFilterState {
  countryCodes: string[];
  langs: string[];
  deposit: string;
  partner: string;
  partners: Array<{ id: number; label: string }>;
  accountTypes: string[];
  riskPriorities: string[];
  registeredFrom: string;
  registeredTo: string;
  lastSeenFrom: string;
  lastSeenTo: string;
  onlyActive: boolean;
}
export interface PartnerFilterState {
  countryCodes: string[];
  langs: string[];
  statuses: string[];
  plans: string[];
  subPartner: string;
  balanceFrom: string;
  registeredFrom: string;
  registeredTo: string;
  onlyActive: boolean;
}
export interface PartnerSearchResult {
  id: number;
  nick: string | null;
  email: string;
}
export const DEMO_PARTNERS: PartnerSearchResult[] = [
  { id: 101, nick: 'demo_partner_1', email: 'partner1@example.test' },
  { id: 102, nick: 'demo_partner_2', email: 'partner2@example.test' },
];
export const EMPTY_TRADER_FILTERS: TraderFilterState = {
  countryCodes: [],
  langs: [],
  deposit: 'any',
  partner: 'any',
  partners: [],
  accountTypes: [],
  riskPriorities: [],
  registeredFrom: '',
  registeredTo: '',
  lastSeenFrom: '',
  lastSeenTo: '',
  onlyActive: true,
};
export const EMPTY_PARTNER_FILTERS: PartnerFilterState = {
  countryCodes: [],
  langs: [],
  statuses: [],
  plans: [],
  subPartner: 'any',
  balanceFrom: '',
  registeredFrom: '',
  registeredTo: '',
  onlyActive: true,
};
export const LANGUAGE_OPTIONS = LETTER_LANGUAGES;
export const ACCOUNT_TYPE_OPTIONS: Option[] = [
  { value: 'REAL', label: 'Реальный' },
  { value: 'DEMO', label: 'Демо' },
];
export const RISK_OPTIONS: Option[] = [
  { value: 'LOW', label: 'Низкий' },
  { value: 'HIGH', label: 'Высокий' },
];
export const DEPOSIT_CHOICES: Option[] = [
  { value: 'any', label: 'Не важно' },
  { value: 'yes', label: 'С депозитами' },
  { value: 'no', label: 'Без депозитов' },
];
export const PARTNER_CHOICES: Option[] = [
  { value: 'any', label: 'Не важно' },
  { value: 'yes', label: 'С партнёром' },
  { value: 'no', label: 'Без партнёра' },
  { value: 'specific', label: 'Конкретные партнёры' },
];
export const SUB_PARTNER_CHOICES: Option[] = [
  { value: 'any', label: 'Не важно' },
  { value: 'yes', label: 'Суб-партнёры' },
  { value: 'no', label: 'Основные партнёры' },
];
export const PARTNER_STATUS_OPTIONS: Option[] = [
  { value: 'ACTIVE', label: 'Активный' },
  { value: 'INACTIVE', label: 'Неактивный' },
];
export const PARTNER_PLAN_OPTIONS: Option[] = [
  { value: 'CPA', label: 'CPA' },
  { value: 'REVSHARE', label: 'RevShare' },
];
export const countryOptions = (): Option[] => [
  { value: 'UA', label: 'Украина' },
  { value: 'PL', label: 'Польша' },
  { value: 'GB', label: 'Великобритания' },
];

const calendarDate = (now: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kiev',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join('-');
};
const daysBefore = (days: number, now = new Date()) => {
  const date = new Date(`${calendarDate(now)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};
const presets = (days: number[]): RangePreset[] =>
  days.map((day) => ({
    label: `За ${day} дней`,
    range: (now = new Date()) => ({
      from: daysBefore(day, now),
      to: daysBefore(0, now),
    }),
  }));
export const REGISTERED_PRESETS = presets([7, 30, 90]);
export const LAST_SEEN_PRESETS = presets([7, 30, 180]);
const traders = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  country: ['UA', 'PL', 'GB'][i % 3]!,
  lang: ['ru', 'uk', 'en'][Math.floor(i / 3) % 3]!,
  active: i % 5 !== 0,
  emailUnengaged: i % 4 === 0,
  deposit: i % 2 === 0,
  partnerId: i % 3 === 0 ? null : i % 2 ? 101 : 102,
  account: i % 2 ? 'REAL' : 'DEMO',
  risk: i % 2 ? 'LOW' : 'HIGH',
  registered: daysBefore([1, 5, 12, 25, 50, 100][i % 6]!),
  lastSeen: daysBefore([0, 3, 10, 40, 90][i % 5]!),
}));
const partners = Array.from({ length: 12 }, (_, i) => ({
  id: i + 101,
  country: ['UA', 'PL', 'GB'][i % 3]!,
  lang: ['ru', 'uk', 'en'][i % 3]!,
  active: i % 4 !== 0,
  emailUnengaged: i % 3 === 0,
  status: i % 4 === 0 ? 'INACTIVE' : 'ACTIVE',
  plan: i % 2 ? 'CPA' : 'REVSHARE',
  sub: i % 2 === 0,
  balance: i * 50,
  registered: daysBefore([1, 5, 12, 25, 50, 100][i % 6]!),
}));
const includes = (values: string[], value: string) =>
  !values.length || values.includes(value);
const inRange = (value: string, from: string, to: string) =>
  (!from || value >= from) && (!to || value <= to);
const choiceMatches = (choice: string, value: boolean) =>
  choice === 'any' || (choice === 'yes' ? value : !value);
const matchingTraders = (f: TraderFilterState) =>
  traders.filter(
    (row) =>
      includes(f.countryCodes, row.country) &&
      includes(f.langs, row.lang) &&
      (!f.onlyActive || row.active) &&
      choiceMatches(f.deposit, row.deposit) &&
      (f.partner === 'specific'
        ? f.partners.some((partner) => partner.id === row.partnerId)
        : choiceMatches(f.partner, row.partnerId !== null)) &&
      includes(f.accountTypes, row.account) &&
      includes(f.riskPriorities, row.risk) &&
      inRange(row.registered, f.registeredFrom, f.registeredTo) &&
      inRange(row.lastSeen, f.lastSeenFrom, f.lastSeenTo),
  );
const matchingPartners = (f: PartnerFilterState) =>
  partners.filter(
    (row) =>
      includes(f.countryCodes, row.country) &&
      includes(f.langs, row.lang) &&
      (!f.onlyActive || row.active) &&
      (f.statuses.length
        ? f.statuses.includes(row.status)
        : row.status === 'ACTIVE') &&
      includes(f.plans, row.plan) &&
      choiceMatches(f.subPartner, row.sub) &&
      (!f.balanceFrom || row.balance >= Number(f.balanceFrom)) &&
      inRange(row.registered, f.registeredFrom, f.registeredTo),
  );

export function countAudience(
  target: CampaignTarget,
  filters: TraderFilterState | PartnerFilterState,
  skipUnengaged = false,
) {
  const matched =
    target === 'TRADER'
      ? matchingTraders(filters as TraderFilterState)
      : matchingPartners(filters as PartnerFilterState);
  const rows = skipUnengaged
    ? matched.filter((row) => !row.emailUnengaged)
    : matched;
  const baseline =
    target === 'TRADER'
      ? matchingTraders(EMPTY_TRADER_FILTERS)
      : matchingPartners(EMPTY_PARTNER_FILTERS);
  const ids = new Set(matched.map((row) => row.id));
  return {
    count: rows.length,
    skipped: matched.length - rows.length,
    everyone: baseline.every((row) => ids.has(row.id)),
    byLanguage: LETTER_LANGUAGES.map(({ value: locale }) => ({
      locale,
      count: rows.filter((row) => row.lang === locale).length,
    })).filter((row) => row.count > 0),
  };
}
const rangeProblem = (from: string, to: string) =>
  from && to && from > to ? 'Начальная дата позже конечной' : null;
export const traderFiltersProblem = (f: TraderFilterState) =>
  rangeProblem(f.registeredFrom, f.registeredTo) ??
  rangeProblem(f.lastSeenFrom, f.lastSeenTo) ??
  (f.partner === 'specific' && !f.partners.length ? 'Выберите партнёра' : null);
export const partnerFiltersProblem = (f: PartnerFilterState) =>
  rangeProblem(f.registeredFrom, f.registeredTo) ??
  (f.balanceFrom &&
  (!Number.isFinite(Number(f.balanceFrom)) || Number(f.balanceFrom) < 0)
    ? 'Укажите корректный баланс'
    : null);
export const targetLabel = (target: CampaignTarget) =>
  target === 'PARTNER' ? 'Партнёры' : 'Трейдеры';
export const recipientsWord = (target: CampaignTarget, _count: number) =>
  target === 'PARTNER' ? 'партнёров' : 'трейдеров';

const labels = (values: string[], options: readonly Option[]) =>
  values
    .map(
      (value) =>
        options.find((option) => option.value === value)?.label ?? value,
    )
    .join(', ');
const dateRangeLine = (label: string, from: string, to: string) =>
  from || to
    ? `${label}: ${from ? `с ${from}` : ''}${from && to ? ' ' : ''}${to ? `по ${to}` : ''}`
    : null;
export function filtersSummary(
  target: CampaignTarget,
  filters: TraderFilterState | PartnerFilterState,
): string[] {
  const lines: Array<string | null> = [
    filters.countryCodes.length
      ? `Страны: ${labels(filters.countryCodes, countryOptions())}`
      : null,
    filters.langs.length
      ? `Языки: ${labels(filters.langs, LANGUAGE_OPTIONS)}`
      : null,
    dateRangeLine('Регистрация', filters.registeredFrom, filters.registeredTo),
    filters.onlyActive ? 'Только активные' : null,
  ];
  if (target === 'TRADER') {
    const f = filters as TraderFilterState;
    lines.push(
      f.deposit !== 'any' ? labels([f.deposit], DEPOSIT_CHOICES) : null,
      f.partner === 'specific'
        ? `Партнёры: ${f.partners.map((partner) => partner.label).join(', ')}`
        : f.partner !== 'any'
          ? labels([f.partner], PARTNER_CHOICES)
          : null,
      f.accountTypes.length
        ? `Тип аккаунта: ${labels(f.accountTypes, ACCOUNT_TYPE_OPTIONS)}`
        : null,
      f.riskPriorities.length
        ? `Риск-приоритет: ${labels(f.riskPriorities, RISK_OPTIONS)}`
        : null,
      dateRangeLine('Последний вход', f.lastSeenFrom, f.lastSeenTo),
    );
  } else {
    const f = filters as PartnerFilterState;
    lines.push(
      f.statuses.length
        ? `Статус: ${labels(f.statuses, PARTNER_STATUS_OPTIONS)}`
        : null,
      f.plans.length ? `План: ${labels(f.plans, PARTNER_PLAN_OPTIONS)}` : null,
      f.subPartner !== 'any'
        ? labels([f.subPartner], SUB_PARTNER_CHOICES)
        : null,
      f.balanceFrom ? `Баланс от: $${f.balanceFrom}` : null,
    );
  }
  return lines.filter((line): line is string => line !== null);
}
export const versionReach = (
  rows: Array<{ locale: string; count: number }>,
  locales: LetterLocale[],
  defaultLocale: LetterLocale,
): VersionReach[] =>
  locales.map((locale) => {
    const own = rows.find((row) => row.locale === locale)?.count ?? 0;
    const fallback =
      locale === defaultLocale
        ? rows.filter((row) => !locales.includes(row.locale as LetterLocale))
        : [];
    return {
      locale,
      own,
      fallback,
      total: own + fallback.reduce((sum, row) => sum + row.count, 0),
    };
  });
