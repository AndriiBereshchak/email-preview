import { useMemo } from 'react';
import { ChipSelect } from './ChipSelect';
import { PartnerPicker } from './PartnerPicker';
import { Switch } from './Switch';
import {
  ACCOUNT_TYPE_OPTIONS,
  DEPOSIT_CHOICES,
  LANGUAGE_OPTIONS,
  LAST_SEEN_PRESETS,
  PARTNER_CHOICES,
  REGISTERED_PRESETS,
  RISK_OPTIONS,
  countryOptions,
  type TraderFilterState,
  type PartnerSearchResult,
} from './audienceModel';
import { ChoiceSelect } from './ChoiceSelect';
import { DateRange } from './DateRange';
import { FilterField as Field } from './FilterField';
import { Group } from './Group';
import { Presets } from './Presets';
import e from './emailCampaign.module.css';

interface Props {
  value: TraderFilterState;
  onChange: (next: TraderFilterState) => void;
}

const TraderFilters = ({ value, onChange }: Props) => {
  const countries = useMemo(() => countryOptions(), []);

  const set = <K extends keyof TraderFilterState>(
    key: K,
    next: TraderFilterState[K],
  ) => onChange({ ...value, [key]: next });

  const addPartner = (partner: PartnerSearchResult | null) => {
    if (!partner || value.partners.some((p) => p.id === partner.id)) return;
    set('partners', [
      ...value.partners,
      {
        id: partner.id,
        label: `#${partner.id} · ${partner.nick ?? partner.email}`,
      },
    ]);
  };

  return (
    <div className={e.groups}>
      <Group title="Где и на каком языке">
        <Field label="Страна">
          <ChipSelect
            fieldClassName={e.chipField}
            overlay
            options={countries}
            value={value.countryCodes}
            onChange={(next) => set('countryCodes', next)}
            placeholder="Все страны"
            emptyText="Нет такой страны"
          />
        </Field>
        <Field label="Язык интерфейса">
          <ChipSelect
            fieldClassName={e.chipField}
            overlay
            options={LANGUAGE_OPTIONS}
            value={value.langs}
            onChange={(next) => set('langs', next)}
            placeholder="Все языки"
          />
        </Field>
      </Group>

      <Group title="Деньги и аккаунт">
        <Field label="Депозиты">
          <ChoiceSelect
            value={value.deposit}
            options={DEPOSIT_CHOICES}
            onChange={(next) => set('deposit', next)}
          />
        </Field>
        <Field label="Партнёр">
          <ChoiceSelect
            value={value.partner}
            options={PARTNER_CHOICES}
            onChange={(next) => set('partner', next)}
          />
        </Field>
        {value.partner === 'specific' && (
          <Field label="Какие партнёры" wide>
            {value.partners.length > 0 && (
              <div className={e.partnerChips}>
                {value.partners.map((partner) => (
                  <span key={partner.id} className={e.partnerChip}>
                    {partner.label}
                    <button
                      type="button"
                      aria-label={`Убрать ${partner.label}`}
                      onClick={() =>
                        set(
                          'partners',
                          value.partners.filter((p) => p.id !== partner.id),
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <PartnerPicker
              value={null}
              onChange={addPartner}
              label="Найти по id, нику или почте"
            />
          </Field>
        )}
        <Field label="Тип аккаунта">
          <ChipSelect
            fieldClassName={e.chipField}
            overlay
            options={ACCOUNT_TYPE_OPTIONS}
            value={value.accountTypes}
            onChange={(next) => set('accountTypes', next)}
            placeholder="Любой"
          />
        </Field>
        <Field label="Риск-приоритет">
          <ChipSelect
            fieldClassName={e.chipField}
            overlay
            options={RISK_OPTIONS}
            value={value.riskPriorities}
            onChange={(next) => set('riskPriorities', next)}
            placeholder="Любой"
          />
        </Field>
      </Group>

      <Group title="Активность">
        <Field label="Регистрация" wide>
          <Presets
            presets={REGISTERED_PRESETS}
            from={value.registeredFrom}
            to={value.registeredTo}
            anyLabel="Любая дата"
            onPick={(from, to) =>
              onChange({ ...value, registeredFrom: from, registeredTo: to })
            }
          />
          <DateRange
            from={value.registeredFrom}
            to={value.registeredTo}
            onChange={(from, to) =>
              onChange({ ...value, registeredFrom: from, registeredTo: to })
            }
          />
        </Field>
        <Field label="Последний вход" wide>
          <Presets
            presets={LAST_SEEN_PRESETS}
            from={value.lastSeenFrom}
            to={value.lastSeenTo}
            anyLabel="Не важно"
            onPick={(from, to) =>
              onChange({ ...value, lastSeenFrom: from, lastSeenTo: to })
            }
          />
          <DateRange
            from={value.lastSeenFrom}
            to={value.lastSeenTo}
            onChange={(from, to) =>
              onChange({ ...value, lastSeenFrom: from, lastSeenTo: to })
            }
          />
        </Field>
      </Group>

      <label className={`${e.switchRow} ${e.groupEnd}`}>
        <Switch
          checked={value.onlyActive}
          onChange={(event) => set('onlyActive', event.target.checked)}
        />
        <span>Только активные — без заблокированных аккаунтов</span>
      </label>
    </div>
  );
};

export default TraderFilters;
