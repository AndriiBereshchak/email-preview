import { cx as clsx } from '../utils/localModel';
import { Link, useNavigate } from 'react-router-dom';
import type { CampaignSummary } from '../utils/campaignModel';
import { formatDateTime, percent, phaseView } from '../utils/campaignModel';
import { formatCount, targetLabel } from '../utils/audienceModel';
import { ColumnsRow } from '../parts/TableViews/ColumnsRow';
import { StatusPill } from './StatusPill';
import e from './emailCampaign.module.css';

type Props = CampaignSummary & { index?: number; updateTable?: () => void };

interface ShareProps {
  value?: number;
  of?: number;
  'data-col': string;
}

const Share = ({ value, of, ...cell }: ShareProps) => (
  <td className={e.numCell} {...cell}>
    {value === undefined ? (
      <span className={e.numRate}>—</span>
    ) : (
      <>
        <span className={e.numValue}>{formatCount(value)}</span>
        <span className={e.numRate}>{percent(value, of ?? 0) ?? '—'}</span>
      </>
    )}
  </td>
);

const CampaignRow = (row: Props) => {
  const navigate = useNavigate();
  const view = phaseView(row);
  const n = row.numbers ?? undefined;
  const href = `/admin/distribution/campaign/${row.id}`;
  const isCampaign = row.kind === 'campaign';
  const meta = [
    `#${row.id}`,
    targetLabel(row.target),
    row.locales.length > 0
      ? row.locales.map((locale) => locale.toUpperCase()).join(' ')
      : null,
    formatDateTime(row.startedAt ?? row.createdAt),
    row.createdByName,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ColumnsRow
      className={clsx(isCampaign && e.rowLink)}
      onClick={isCampaign ? () => navigate(href) : undefined}
    >
      <td data-col="subject" className={e.subjectCell}>
        {isCampaign ? (
          <Link
            to={href}
            className={e.subject}
            onClick={(event) => event.stopPropagation()}
          >
            {row.subject}
          </Link>
        ) : (
          <span className={e.subject}>{row.subject}</span>
        )}
        <span className={e.meta}>{meta}</span>
      </td>
      <td data-col="status" className={e.statusCell}>
        <div className={e.statusStack}>
          <StatusPill view={view} />
          {view.progress !== null && (
            <span className={e.miniBar} aria-hidden="true">
              <span style={{ width: `${Math.round(view.progress * 100)}%` }} />
            </span>
          )}
          {view.hint && <span className={e.meta}>{view.hint}</span>}
        </div>
      </td>
      <td data-col="total" className={e.numCell}>
        <span className={e.numValue}>{n ? formatCount(n.total) : '—'}</span>
        {row.expectedRecipients !== null && (
          <span className={e.numRate}>
            подходило {formatCount(row.expectedRecipients)}
          </span>
        )}
      </td>
      <Share data-col="delivered" value={n?.delivered} of={n?.sent} />
      <Share data-col="opened" value={n?.opened} of={n?.delivered} />
      <Share data-col="clicked" value={n?.clicked} of={n?.delivered} />
      <Share
        data-col="unsubscribed"
        value={n?.unsubscribed}
        of={n?.delivered}
      />
      <td data-col="bounced" className={e.numCell}>
        {n ? (
          <>
            <span className={e.numValue}>{formatCount(n.bounced)}</span>
            <span className={e.numRate}>жалоб {formatCount(n.complained)}</span>
          </>
        ) : (
          <span className={e.numRate}>—</span>
        )}
      </td>
    </ColumnsRow>
  );
};

export default CampaignRow;
