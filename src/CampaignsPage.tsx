import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCampaigns } from './useCampaigns';
import { cx } from './localModel';
import CampaignRow from './CampaignRow';
import e from './emailCampaign.module.css';
const tabs = [
  { value: 'ALL', label: 'Все' },
  { value: 'TRADER', label: 'Трейдерам' },
  { value: 'PARTNER', label: 'Партнёрам' },
] as const;
export default function CampaignsPage() {
  const [target, setTarget] = useState<string>('ALL');
  const campaigns = useCampaigns().filter(
    (item) => target === 'ALL' || item.target === target,
  );
  return (
    <div className={e.page}>
      <header className={e.pageHead}>
        <div>
          <h2 className={e.pageTitle}>Email-рассылки</h2>
          <p className={e.pageLead}>
            Локальные тестовые кампании. Отправка и статистика имитируются;
            после перезагрузки изменения сбрасываются.
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
      </div>
      <div className={e.tableCard}>
        <div className={e.tableScroll}>
          <table className={e.dataTable}>
            <thead>
              <tr>
                {[
                  'Рассылка',
                  'Статус',
                  'Писем',
                  'Доставлено',
                  'Открыли',
                  'Кликнули',
                  'Отписались',
                  'Отказы',
                ].map((title) => (
                  <th key={title}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))}
              {!campaigns.length && (
                <tr>
                  <td colSpan={8}>Рассылок пока нет</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
