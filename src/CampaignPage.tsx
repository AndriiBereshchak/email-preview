import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCampaigns } from './useCampaigns';
import { campaignStore } from './campaignStore';
import { formatDateTime, percent, phaseView } from './campaignModel';
import { filtersSummary, targetLabel } from './audienceModel';
import { cx, languageName } from './localModel';
import { StatusPill } from './StatusPill';
import CampaignKpi from './CampaignKpi';
import SentLetter from './SentLetter';
import e from './emailCampaign.module.css';
export default function CampaignPage() {
  const { id } = useParams();
  const data = useCampaigns().find((item) => String(item.id) === id);
  const [locale, setLocale] = useState<string>('');
  if (!data)
    return (
      <div className={e.page}>
        <Link className={e.back} to="/admin/distribution">
          ← Все рассылки
        </Link>
        <h2 className={e.pageTitle}>Рассылка не найдена</h2>
      </div>
    );
  const n = data.numbers;
  const view = phaseView(data);
  const activeLetter =
    data.letters.find((letter) => letter.locale === locale) ??
    data.letters.find((letter) => letter.locale === data.defaultLocale)!;
  return (
    <div className={e.page}>
      <header className={e.detailHead}>
        <div className={e.detailTitle}>
          <Link to="/admin/distribution" className={e.back}>
            ← Все рассылки
          </Link>
          <div className={e.detailStatus}>
            <StatusPill view={view} />
            {view.hint && <span className={e.meta}>{view.hint}</span>}
          </div>
          <h2 className={e.pageTitle}>{data.subject}</h2>
          <span className={e.meta}>
            #{data.id} · {targetLabel(data.target)} · запущена{' '}
            {formatDateTime(data.createdAt)}
          </span>
        </div>
        {data.phase === 'sending' && (
          <button
            type="button"
            className={cx(e.btn, e.btnDanger)}
            onClick={() => {
              if (window.confirm('Остановить локальную имитацию рассылки?'))
                campaignStore.stop(data.id);
            }}
          >
            Остановить рассылку
          </button>
        )}
      </header>
      {view.progress !== null && (
        <div
          className={e.progressTrack}
          role="progressbar"
          aria-label="Прогресс рассылки"
          aria-valuemin={0}
          aria-valuemax={n.total}
          aria-valuenow={n.sent}
        >
          <span style={{ width: `${Math.round(view.progress * 100)}%` }} />
        </div>
      )}
      <section className={e.kpis} aria-label="Статистика">
        <CampaignKpi label="Писем" value={n.total} />
        <CampaignKpi
          label="Отправлено"
          value={n.sent}
          rate={percent(n.sent, n.total)}
        />
        <CampaignKpi
          label="Доставлено"
          value={n.delivered}
          rate={percent(n.delivered, n.sent)}
        />
        <CampaignKpi
          label="Открыли"
          value={n.opened}
          rate={percent(n.opened, n.delivered)}
        />
        <CampaignKpi
          label="Кликнули"
          value={n.clicked}
          rate={percent(n.clicked, n.delivered)}
        />
        <CampaignKpi label="Отписались" value={n.unsubscribed} />
        <CampaignKpi label="Отказы" value={n.bounced} />
        <CampaignKpi label="Жалобы на спам" value={n.complained} />
      </section>
      <p className={e.footnote}>
        Локальная имитация: письма не отправляются, показатели рассчитаны на
        тестовых данных.
      </p>
      <section className={e.panel}>
        <h3 className={e.panelTitle}>По языкам</h3>
        <div className={e.tableScroll}>
          <table className={e.dataTable}>
            <thead>
              <tr>
                {[
                  'Язык',
                  'Тема',
                  'Писем',
                  'Доставлено',
                  'Открыли',
                  'Кликнули',
                  'Статус',
                ].map((title) => (
                  <th key={title}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.versions.map((version) => (
                <tr key={version.locale}>
                  <td>
                    {languageName(version.locale)}
                    {version.locale === data.defaultLocale && (
                      <span className={e.badge}>основная</span>
                    )}
                  </td>
                  <td>
                    {
                      data.letters.find(
                        (letter) => letter.locale === version.locale,
                      )?.subject
                    }
                  </td>
                  <td>{version.numbers.total}</td>
                  <td>{version.numbers.delivered}</td>
                  <td>{version.numbers.opened}</td>
                  <td>{version.numbers.clicked}</td>
                  <td>
                    {version.numbers.queued
                      ? 'Отправляется'
                      : version.numbers.cancelled
                        ? 'Остановлена'
                        : 'Завершена'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className={e.detailColumns}>
        <section className={e.panel}>
          <h3 className={e.panelTitle}>Аудитория</h3>
          <p>
            {targetLabel(data.target)} · до {n.total}
          </p>
          <ul className={e.filterList}>
            {filtersSummary(data.target, data.audience.filters).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p>В очереди: {n.queued}</p>
          <p>Не отправлено после остановки: {n.cancelled}</p>
        </section>
        <section className={e.panel}>
          <h3 className={e.panelTitle}>Письмо</h3>
          <div className={e.versions} role="tablist" aria-label="Версии письма">
            {data.letters.map((letter) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeLetter.locale === letter.locale}
                key={letter.locale}
                className={cx(
                  e.version,
                  activeLetter.locale === letter.locale && e.versionActive,
                )}
                onClick={() => setLocale(letter.locale)}
              >
                {languageName(letter.locale)}
              </button>
            ))}
          </div>
          <SentLetter letter={activeLetter} />
        </section>
      </div>
    </div>
  );
}
