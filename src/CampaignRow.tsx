import { Link } from 'react-router-dom';
import type { Campaign } from './campaignStore';
import { formatDateTime, phaseView } from './campaignModel';
import { formatCount, targetLabel } from './audienceModel';
import { StatusPill } from './StatusPill';
import CampaignShare from './CampaignShare';
import e from './emailCampaign.module.css';
export default function CampaignRow({ campaign }: { campaign: Campaign }) {
  const n = campaign.numbers;
  const view = phaseView(campaign);
  return (
    <tr>
      <td className={e.subjectCell}>
        <Link
          className={e.subject}
          to={`/admin/distribution/campaign/${campaign.id}`}
        >
          {campaign.subject}
        </Link>
        <span className={e.meta}>
          #{campaign.id} · {targetLabel(campaign.target)} ·{' '}
          {campaign.letters
            .map((letter) => letter.locale.toUpperCase())
            .join(' ')}{' '}
          · {formatDateTime(campaign.createdAt)}
        </span>
      </td>
      <td className={e.statusCell}>
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
      <td className={e.numCell}>{formatCount(n.total)}</td>
      <CampaignShare value={n.delivered} of={n.sent} />
      <CampaignShare value={n.opened} of={n.delivered} />
      <CampaignShare value={n.clicked} of={n.delivered} />
      <CampaignShare value={n.unsubscribed} of={n.delivered} />
      <td className={e.numCell}>
        <span className={e.numValue}>{n.bounced}</span>
        <span className={e.numRate}>жалоб {n.complained}</span>
      </td>
    </tr>
  );
}
