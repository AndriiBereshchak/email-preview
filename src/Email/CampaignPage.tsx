import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { useCampaigns } from './useCampaigns';
import { campaignStore } from '../mocks/campaignStore';
import { formatDateTime, percent, phaseView } from '../utils/campaignModel';
import { filtersSummary, targetLabel } from '../utils/audienceModel';
import {
  cx as clsx,
  formatCount,
  languageName,
  renderLocalPreview,
  type LetterDraft,
} from '../utils/localModel';
import { StatusPill } from './StatusPill';
import LetterPreview from './LetterPreview';
import e from './emailCampaign.module.css';

const Kpi = ({
  label,
  value,
  rate,
}: {
  label: string;
  value: number | undefined;
  rate?: string | null;
}) => (
  <div className={e.kpi}>
    <span className={e.kpiLabel}>{label}</span>
    <span className={e.kpiValue}>
      {value === undefined ? '—' : formatCount(value)}
    </span>
    <span className={e.kpiRate}>{rate ?? ''}</span>
  </div>
);

const SentLetter = ({ letter }: { letter: LetterDraft }) => (
  <LetterPreview preview={renderLocalPreview(letter)} stale={false} />
);

const CampaignPage = () => {
  const { id } = useParams();
  const data = useCampaigns().find((item) => String(item.id) === id);
  const [locale, setLocale] = useState<string | null>(null);

  if (!data) {
    return (
      <div className={e.page}>
        <Link to="/admin/distribution" className={e.back}>
          ← Все рассылки
        </Link>
        <p className={e.alert}>Рассылка не найдена</p>
      </div>
    );
  }

  const view = phaseView(data);
  const n = data.numbers;
  const active = data.phase === 'sending';
  const letter =
    data.letters.find(
      (item) => item.locale === (locale ?? data.defaultLocale),
    ) ?? data.letters[0];
  const stop = () => {
    if (
      !window.confirm(
        'Остановить рассылку? Письма, которые уже ушли, не отзываются.',
      )
    )
      return;
    campaignStore.stop(data.id);
    toast.success('Рассылка остановлена');
  };

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
            {[
              `#${data.id}`,
              targetLabel(data.target),
              `запущена ${formatDateTime(data.createdAt)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        {active && (
          <button
            type="button"
            className={clsx(e.btn, e.btnDanger)}
            onClick={stop}
          >
            Остановить рассылку
          </button>
        )}
      </header>

      {view.progress !== null && (
        <div className={e.progressTrack} aria-hidden="true">
          <span style={{ width: `${Math.round(view.progress * 100)}%` }} />
        </div>
      )}

      <section className={e.kpis} aria-label="Статистика">
        <Kpi
          label="Писем"
          value={n?.total}
          rate={
            data.expectedRecipients !== null
              ? `подходило ${formatCount(data.expectedRecipients)}`
              : null
          }
        />
        <Kpi
          label="Отправлено"
          value={n?.sent}
          rate={n && percent(n.sent, n.total)}
        />
        <Kpi
          label="Доставлено"
          value={n?.delivered}
          rate={n && percent(n.delivered, n.sent)}
        />
        <Kpi
          label="Открыли"
          value={n?.opened}
          rate={n && percent(n.opened, n.delivered)}
        />
        <Kpi
          label="Кликнули"
          value={n?.clicked}
          rate={n && percent(n.clicked, n.delivered)}
        />
        <Kpi
          label="Отписались"
          value={n?.unsubscribed}
          rate={n && percent(n.unsubscribed, n.delivered)}
        />
        <Kpi
          label="Отказы"
          value={n?.bounced}
          rate={n && percent(n.bounced, n.sent)}
        />
        <Kpi
          label="Жалобы на спам"
          value={n?.complained}
          rate={n && percent(n.complained, n.delivered)}
        />
      </section>
      <p className={e.footnote}>
        Доставлено и отказы — доля от отправленных, остальное — от доставленных.
        Открытия считаются по пикселю в письме и бывают завышены. Локальная
        имитация: письма не отправляются, показатели рассчитаны на тестовых
        данных.
      </p>

      <section className={e.panel}>
        <h3 className={e.panelTitle}>По языкам</h3>
        <div className={e.tableScroll}>
          <table className={e.dataTable}>
            <thead>
              <tr>
                <th>Язык</th>
                <th>Тема</th>
                <th>Писем</th>
                <th>Доставлено</th>
                <th>Открыли</th>
                <th>Кликнули</th>
                <th>Отписались</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.versions.map((version) => {
                const v = version.numbers;
                return (
                  <tr key={version.locale}>
                    <td>
                      <span className={e.langCell}>
                        {languageName(version.locale)}
                        {version.locale === data.defaultLocale && (
                          <span className={e.badge}>основная</span>
                        )}
                      </span>
                    </td>
                    <td className={e.subjectText}>
                      {
                        data.letters.find(
                          (item) => item.locale === version.locale,
                        )?.subject
                      }
                    </td>
                    <td className={e.num}>{v ? formatCount(v.total) : '—'}</td>
                    <td className={e.numCell}>
                      <span className={e.numValue}>
                        {v ? formatCount(v.delivered) : '—'}
                      </span>
                      <span className={e.numRate}>
                        {v ? percent(v.delivered, v.sent) : null}
                      </span>
                    </td>
                    <td className={e.numCell}>
                      <span className={e.numValue}>
                        {v ? formatCount(v.opened) : '—'}
                      </span>
                      <span className={e.numRate}>
                        {v ? percent(v.opened, v.delivered) : null}
                      </span>
                    </td>
                    <td className={e.numCell}>
                      <span className={e.numValue}>
                        {v ? formatCount(v.clicked) : '—'}
                      </span>
                      <span className={e.numRate}>
                        {v ? percent(v.clicked, v.delivered) : null}
                      </span>
                    </td>
                    <td className={e.numCell}>
                      <span className={e.numValue}>
                        {v ? formatCount(v.unsubscribed) : '—'}
                      </span>
                      <span className={e.numRate}>
                        {v ? percent(v.unsubscribed, v.delivered) : null}
                      </span>
                    </td>
                    <td className={e.meta}>
                      {v?.queued
                        ? 'Отправляется'
                        : v?.cancelled
                          ? 'Остановлена'
                          : 'Завершена'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className={e.detailColumns}>
        <section className={e.panel}>
          <h3 className={e.panelTitle}>Кому</h3>
          {data.audience && (
            <ul className={e.filterList}>
              <li>{targetLabel(data.target)}</li>
              {data.audience.everyone && <li>Без фильтров — всем</li>}
              {filtersSummary(data.target, data.audience.filters).map(
                (line) => (
                  <li key={line}>{line}</li>
                ),
              )}
            </ul>
          )}
          <dl className={e.facts}>
            <div>
              <dt>Подходило при запуске</dt>
              <dd>
                {data.expectedRecipients !== null
                  ? formatCount(data.expectedRecipients)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Поставлено в локальную очередь</dt>
              <dd>{formatCount(n.total)}</dd>
            </div>
            {n && n.cancelled > 0 && (
              <div>
                <dt>Не отправлено после остановки</dt>
                <dd>{formatCount(n.cancelled)}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className={e.panel}>
          <div className={e.panelHead}>
            <h3 className={e.panelTitle}>Письмо</h3>
            {data.letters.length > 1 && (
              <div
                className={e.segmented}
                role="tablist"
                aria-label="Версия письма"
              >
                {data.letters.map((item) => (
                  <button
                    key={item.locale}
                    type="button"
                    role="tab"
                    aria-selected={item.locale === letter?.locale}
                    className={clsx(
                      e.segment,
                      item.locale === letter?.locale && e.segmentActive,
                    )}
                    onClick={() => setLocale(item.locale)}
                  >
                    {languageName(item.locale)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {letter && <SentLetter letter={letter} />}
        </section>
      </div>
    </div>
  );
};

export default CampaignPage;
