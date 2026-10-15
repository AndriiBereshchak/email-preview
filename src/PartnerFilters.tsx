import { useMemo } from 'react';
import { CustomInput } from './CustomInput';
import { ChipSelect } from './ChipSelect';
import { Switch } from './Switch';
import { LANGUAGE_OPTIONS, PARTNER_PLAN_OPTIONS, PARTNER_STATUS_OPTIONS, REGISTERED_PRESETS, SUB_PARTNER_CHOICES, countryOptions, type PartnerFilterState } from './audienceModel';
import { ChoiceSelect } from './ChoiceSelect';
import { DateRange } from './DateRange';
import { FilterField as Field } from './FilterField';
import { Group } from './Group';
import { Presets } from './Presets';
import e from './emailCampaign.module.css';

interface Props {
  value: PartnerFilterState
  onChange: (next: PartnerFilterState) => void
}

const PartnerFilters = ({ value, onChange }: Props) => {
  const countries = useMemo(() => countryOptions(), [])

  const set = <K extends keyof PartnerFilterState>(
    key: K,
    next: PartnerFilterState[K],
  ) => onChange({ ...value, [key]: next })

  return (
    <div className={e.groups}>
      <Group title="Где и на каком языке">
        <Field label="Страна">
          <ChipSelect
            fieldClassName={e.chipField}
            overlay
            options={countries}
            value={value.countryCodes}
            onChange={next => set('countryCodes', next)}
            placeholder="Все страны"
            emptyText="Нет такой страны"
          />
        </Field>
        <Field label="Язык кабинета">
          <ChipSelect
            fieldClassName={e.chipField}
            overlay
            options={LANGUAGE_OPTIONS}
            value={value.langs}
            onChange={next => set('langs', next)}
            placeholder="Все языки"
          />
        </Field>
      </Group>

      <Group title="Партнёрская программа">
        <Field
          label="Статус"
          hint="Не выбран — только активные. Не подтвердившим почту письма не уходят.">
          <ChipSelect
            fieldClassName={e.chipField}
            overlay
            options={PARTNER_STATUS_OPTIONS}
            value={value.statuses}
            onChange={next => set('statuses', next)}
            placeholder="Только активные"
          />
        </Field>
        <Field label="План">
          <ChipSelect
            fieldClassName={e.chipField}
            overlay
            options={PARTNER_PLAN_OPTIONS}
            value={value.plans}
            onChange={next => set('plans', next)}
            placeholder="Любой"
          />
        </Field>
        <Field label="Суб-партнёры">
          <ChoiceSelect
            value={value.subPartner}
            options={SUB_PARTNER_CHOICES}
            onChange={next => set('subPartner', next)}
          />
        </Field>
        <Field label="Баланс от, $">
          <CustomInput
            inputMode="decimal"
            value={value.balanceFrom}
            onChange={event => set('balanceFrom', event.target.value)}
            placeholder="Любой"
          />
        </Field>
      </Group>

      <Group title="Аккаунт">
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
      </Group>

      <label className={`${e.switchRow} ${e.groupEnd}`}>
        <Switch
          checked={value.onlyActive}
          onChange={event => set('onlyActive', event.target.checked)}
        />
        <span>Только незаблокированные партнёры</span>
      </label>
    </div>
  )
}

export default PartnerFilters
