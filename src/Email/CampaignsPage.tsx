import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CustomDatePicker from '../parts/CustomDatePicker/CustomDatePicker';
import { TableViewsSlot } from '../parts/TableViews/TableViewsSlot';
import { TableColumnsContext } from '../parts/TableViews/ColumnsRow';
import { useTableColumns } from '../parts/TableViews/useTableColumns';
import { EMPTY_PERIOD, matchesPeriod } from '../utils/campaignDates';
import { CAMPAIGNS } from '../mocks/campaigns';
import { cx } from '../utils/localModel';
import CampaignRow from './CampaignRow';
import { campaignTitles } from './campaignTitles';
import { campaignSummary } from '../utils/campaignModel';
import e from './emailCampaign.module.css';
const tabs = [
  { value: 'ALL', label: 'Все' },
  { value: 'TRADER', label: 'Трейдерам' },
  { value: 'PARTNER', label: 'Партнёрам' },
] as const;
export default function CampaignsPage() {
  const { pathname } = useLocation();
  const [target, setTarget] = useState<string>(
    pathname.endsWith('/partners') ? 'PARTNER' : 'ALL',
  );
  const [period, setPeriod] = useState(EMPTY_PERIOD);
  const { layout, setLayout, visibleKeys } = useTableColumns(
    'distribution.campaigns',
    campaignTitles,
  );
  const visibleTitles = visibleKeys.map(
    (key) => campaignTitles.find((title) => title.key === key)!,
  );
  const campaigns = CAMPAIGNS.filter(
    (item) =>
      (target === 'ALL' || item.target === target) &&
      matchesPeriod(item.createdAt, period),
  );
  return (
    <div className={e.page}>
      <header className={e.pageHead}>
        <div>
          <h2 className={e.pageTitle}>Email-рассылки</h2>
          <p className={e.pageLead}>
            Демонстрационные кампании и статистика — статические данные. Бекенд
            не подключён, письма не отправляются.
          </p>
        </div>
        <Link
          className={cx(e.btn, e.btnPrimary)}
          to={`/admin/distribution/new${target === 'PARTNER' ? '?audience=partners' : ''}`}
        >
          Новая рассылка
        </Link>
      </header>
      <div className={e.toolbar}>
        <div className={e.segmented} role="tablist" aria-label="Кому">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={target === tab.value}
              className={cx(e.segment, target === tab.value && e.segmentActive)}
              onClick={() => setTarget(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={e.toolbarEnd}>
          <div className={e.datePicker}>
            <CustomDatePicker value={period} onChange={setPeriod} />
          </div>
          <TableViewsSlot
            columns={campaignTitles}
            layout={layout}
            onChange={setLayout}
          />
        </div>
      </div>
      <div className={e.tableCard}>
        <div className={e.tableScroll}>
          <table className={e.dataTable}>
            <thead>
              <tr>
                {visibleTitles.map((title) => (
                  <th key={title.key}>{title.label}</th>
                ))}
              </tr>
            </thead>
            <TableColumnsContext.Provider value={visibleKeys}>
              <tbody>
                {campaigns.map((campaign) => (
                  <CampaignRow
                    key={campaign.id}
                    {...campaignSummary(campaign)}
                  />
                ))}
                {!campaigns.length && (
                  <tr>
                    <td colSpan={visibleKeys.length}>Рассылки не найдены</td>
                  </tr>
                )}
              </tbody>
            </TableColumnsContext.Provider>
          </table>
        </div>
      </div>
      <p className={e.footnote}>
        Доставлено — доля от отправленных; открыли, кликнули и отписались — от
        доставленных. Открытия считаются по пикселю в письме: Apple Mail и часть
        почтовых сервисов загружают его сами, поэтому доля открытий бывает
        завышена. Клики, отписки, отказы и жалобы — точные.
        <br />
        Сейчас показаны статические демонстрационные данные, письма не
        отправляются. Описание выше относится к работе с реальным почтовым
        сервисом.
      </p>
    </div>
  );
}
