// @vitest-environment jsdom
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as campaignHooks from './useCampaigns';
import { campaignStore } from '../mocks/campaignStore';
import CampaignsPage from './CampaignsPage';

const fixtures = campaignStore.getSnapshot().map((campaign) => ({
  ...campaign,
  createdAt: new Date(
    2026,
    9,
    campaign.target === 'TRADER' ? 1 : 10,
    12,
  ).toISOString(),
}));
const show = () =>
  render(
    <MemoryRouter>
      <CampaignsPage />
    </MemoryRouter>,
  );
const headings = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('thead th')).map(
    (cell) => cell.textContent,
  );

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(campaignHooks, 'useCampaigns').mockReturnValue(fixtures);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('local campaign list controls', () => {
  it('combines dates with the audience tab and clears the date range', () => {
    const page = show();
    fireEvent.change(page.getByLabelText('С даты'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(page.getByLabelText('По дату'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.click(page.getByText('Применить'));
    expect(page.queryByRole('link', { name: 'Новости платформы' })).toBeNull();
    expect(
      page.getByRole('link', { name: 'Новости для партнёров' }),
    ).toBeTruthy();
    fireEvent.click(page.getByRole('tab', { name: 'Трейдерам' }));
    expect(page.getByText('Рассылки не найдены')).toBeTruthy();
    const reset = within(
      page.getByText('Период рассылок').parentElement!,
    ).getByText('Сбросить');
    fireEvent.click(reset);
    expect(page.getByRole('link', { name: 'Новости платформы' })).toBeTruthy();
    expect(
      page.queryByRole('link', { name: 'Новости для партнёров' }),
    ).toBeNull();
  });
  it('blocks inverted dates without replacing the applied filter', () => {
    const page = show();
    fireEvent.change(page.getByLabelText('С даты'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(page.getByLabelText('По дату'), {
      target: { value: '2026-10-01' },
    });
    expect((page.getByText('Применить') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(page.getByRole('alert').textContent).toContain('Дата начала');
    expect(page.getAllByRole('link').length).toBe(3);
  });
  it('keeps headers and rows aligned, persists columns and resets the layout', () => {
    let page = show();
    fireEvent.click(page.getByLabelText('Доставлено'));
    fireEvent.click(page.getByLabelText('Переместить «Открыли» выше'));
    const expected = [
      'Рассылка',
      'Статус',
      'Писем',
      'Открыли',
      'Кликнули',
      'Отписались',
      'Отказы',
    ];
    expect(headings(page.container)).toEqual(expected);
    expect(
      Array.from(
        page.container.querySelectorAll('tbody tr:first-child td'),
      ).map((cell) => cell.getAttribute('data-col')),
    ).toEqual([
      'subject',
      'status',
      'total',
      'opened',
      'clicked',
      'unsubscribed',
      'bounced',
    ]);
    expect((page.getByLabelText('Рассылка') as HTMLInputElement).disabled).toBe(
      true,
    );
    page.unmount();
    page = show();
    expect(headings(page.container)).toEqual(expected);
    fireEvent.click(
      within(page.getByText('Настройка колонок').parentElement!).getByText(
        'Сбросить',
      ),
    );
    expect(headings(page.container)).toEqual([
      'Рассылка',
      'Статус',
      'Писем',
      'Доставлено',
      'Открыли',
      'Кликнули',
      'Отписались',
      'Отказы',
    ]);
  });
  it('falls back to defaults for corrupt browser storage', () => {
    localStorage.setItem('table-columns:distribution.campaigns', '{broken');
    const page = show();
    expect(headings(page.container)).toHaveLength(8);
  });
});
