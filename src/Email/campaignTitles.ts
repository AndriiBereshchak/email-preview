interface SortTitle {
  key: string;
  label: string;
  sort: null;
  locked?: boolean;
}

export const campaignTitles: SortTitle[] = [
  { key: 'subject', label: 'Рассылка', sort: null, locked: true },
  { key: 'status', label: 'Статус', sort: null },
  { key: 'total', label: 'Писем', sort: null },
  { key: 'delivered', label: 'Доставлено', sort: null },
  { key: 'opened', label: 'Открыли', sort: null },
  { key: 'clicked', label: 'Кликнули', sort: null },
  { key: 'unsubscribed', label: 'Отписались', sort: null },
  { key: 'bounced', label: 'Отказы', sort: null },
];
