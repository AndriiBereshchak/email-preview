import { CustomInput } from './CustomInput';
import e from './emailCampaign.module.css';

export const DateRange = ({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) => (
  <div className={e.dateRange}>
    <CustomInput
      type="date"
      aria-label="Дата начала"
      value={from}
      onChange={event => onChange(event.target.value, to)}
    />
    <span className={e.dash}>—</span>
    <CustomInput
      type="date"
      aria-label="Дата окончания"
      value={to}
      onChange={event => onChange(from, event.target.value)}
    />
  </div>
)
