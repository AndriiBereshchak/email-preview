// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import type { CampaignSummary } from '../utils/campaignModel';
import { TableColumnsContext } from '../parts/TableViews/ColumnsRow';
import CampaignRow from './CampaignRow';
import { campaignTitles } from './campaignTitles';

afterEach(cleanup);

const row: CampaignSummary = {
  id: 7,
  kind: 'campaign',
  target: 'TRADER',
  subject: 'Осенний бонус',
  phase: 'done',
  status: 'COMPLETED',
  createdAt: '2026-10-01T10:00:00.000Z',
  startedAt: '2026-10-01T10:05:00.000Z',
  createdByName: 'Vim',
  locales: ['ru'],
  defaultLocale: 'ru',
  expectedRecipients: 120,
  enqueued: 100,
  numbers: {
    total: 100,
    queued: 0,
    sent: 100,
    failed: 0,
    suppressed: 0,
    cancelled: 0,
    delivered: 98,
    opened: 40,
    clicked: 12,
    bounced: 2,
    complained: 0,
    unsubscribed: 1,
  },
  statsFromSnapshot: false,
  statsCapturedAt: null,
  lastError: null,
};

const renderRow = (order: string[] | null) =>
  render(
    <MemoryRouter>
      <table>
        <tbody>
          <TableColumnsContext.Provider value={order}>
            <CampaignRow {...row} />
          </TableColumnsContext.Provider>
        </tbody>
      </table>
    </MemoryRouter>,
  );

const columnsOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('tr > td')).map(
    (td) => (td as HTMLElement).dataset.col,
  );

describe('CampaignRow', () => {
  it('renders a cell for every column in the title order', () => {
    const { container } = renderRow(null);
    expect(columnsOf(container)).toEqual(campaignTitles.map((t) => t.key));
  });

  it('follows a saved layout', () => {
    const order = ['subject', 'bounced', 'status', 'opened'];
    const { container } = renderRow(order);
    expect(columnsOf(container)).toEqual(order);
  });
});

describe('CampaignRow content', () => {
  it('shows expected recipients, author and formatted delivery share', () => {
    const { container, getByText } = renderRow(null);
    expect(getByText('подходило 120')).toBeTruthy();
    expect(
      container.querySelector('[data-col="subject"]')?.textContent,
    ).toContain('Vim');
    expect(container.querySelector('[data-col="delivered"]')?.textContent).toBe(
      '9898%',
    );
  });

  it('renders missing statistics as dashes', () => {
    const { container } = render(
      <MemoryRouter>
        <table>
          <tbody>
            <CampaignRow {...row} numbers={null} />
          </tbody>
        </table>
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-col="delivered"]')?.textContent).toBe(
      '—',
    );
    expect(container.querySelector('[data-col="bounced"]')?.textContent).toBe(
      '—',
    );
  });
});
