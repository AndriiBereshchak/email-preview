import { formatCount } from './localModel';
import { percent } from './campaignModel';
import e from './emailCampaign.module.css';
export default function CampaignShare({
  value,
  of,
}: {
  value: number;
  of: number;
}) {
  return (
    <td className={e.numCell}>
      <span className={e.numValue}>{formatCount(value)}</span>
      <span className={e.numRate}>{percent(value, of)}</span>
    </td>
  );
}
