import { formatCount } from './localModel';
import e from './emailCampaign.module.css';
export default function CampaignKpi({
  label,
  value,
  rate,
}: {
  label: string;
  value: number;
  rate?: string;
}) {
  return (
    <div className={e.kpi}>
      <span className={e.kpiLabel}>{label}</span>
      <strong className={e.kpiValue}>{formatCount(value)}</strong>
      {rate && <span className={e.kpiRate}>{rate}</span>}
    </div>
  );
}
