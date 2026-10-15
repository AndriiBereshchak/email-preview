import {
  DEMO_PARTNERS,
  type PartnerSearchResult,
} from '../../utils/audienceModel';

export function PartnerPicker({
  onChange,
  label,
}: {
  value: PartnerSearchResult | null;
  onChange: (partner: PartnerSearchResult | null) => void;
  label: string;
}) {
  return (
    <select
      className="custom-input"
      aria-label={label}
      value=""
      onChange={(event) =>
        onChange(
          DEMO_PARTNERS.find(
            (partner) => partner.id === Number(event.target.value),
          ) ?? null,
        )
      }
    >
      <option value="">{label}</option>
      {DEMO_PARTNERS.map((partner) => (
        <option key={partner.id} value={partner.id}>
          #{partner.id} · {partner.nick}
        </option>
      ))}
    </select>
  );
}
