import { cx as clsx } from '../../utils/localModel';
import {
  formatCount,
  recipientsWord,
  type CampaignTarget,
  type PartnerFilterState,
  type TraderFilterState,
} from '../../utils/audienceModel';
import PartnerFilters from '../PartnerFilters';
import TraderFilters from '../TraderFilters';
import e from '../emailCampaign.module.css';

const TARGETS: ReadonlyArray<{
  value: CampaignTarget;
  title: string;
  text: string;
}> = [
  {
    value: 'TRADER',
    title: 'Трейдерам',
    text: 'Пользователи платформы: страна, язык, депозиты, активность, риск.',
  },
  {
    value: 'PARTNER',
    title: 'Партнёрам',
    text: 'Владельцы партнёрских кабинетов: статус, план, баланс, суб-партнёры.',
  },
];

interface Props {
  target: CampaignTarget;
  onTarget: (target: CampaignTarget) => void;
  traderFilters: TraderFilterState;
  onTraderFilters: (next: TraderFilterState) => void;
  partnerFilters: PartnerFilterState;
  onPartnerFilters: (next: PartnerFilterState) => void;
  count: number | null;
  problem: string | null;
  onNext: () => void;
}

const AudienceStep = (props: Props) => {
  const note =
    props.problem ??
    (props.count === null
      ? 'Считаем получателей…'
      : `Получат до ${formatCount(props.count)} ${recipientsWord(props.target, props.count)}`);

  return (
    <section className={e.card} aria-labelledby="audience-title">
      <div className={e.cardHead}>
        <h3 id="audience-title" className={e.cardTitle}>
          Кому отправить
        </h3>
        <p className={e.cardLead}>
          Выберите аудиторию и сузьте её фильтрами — число получателей в сводке
          справа пересчитывается сразу. Незаполненный фильтр ничего не
          ограничивает.
        </p>
      </div>

      <div className={e.targets} role="radiogroup" aria-label="Аудитория">
        {TARGETS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={props.target === option.value}
            className={clsx(
              e.target,
              props.target === option.value && e.targetActive,
            )}
            onClick={() => props.onTarget(option.value)}
          >
            <span className={e.targetTitle}>{option.title}</span>
            <span className={e.targetText}>{option.text}</span>
          </button>
        ))}
      </div>

      {props.target === 'TRADER' ? (
        <TraderFilters
          value={props.traderFilters}
          onChange={props.onTraderFilters}
        />
      ) : (
        <PartnerFilters
          value={props.partnerFilters}
          onChange={props.onPartnerFilters}
        />
      )}

      <div className={e.stepFooter}>
        <span className={e.footerNote} aria-live="polite">
          {note}
        </span>
        <button
          type="button"
          className={clsx(e.btn, e.btnPrimary)}
          disabled={!props.count || Boolean(props.problem)}
          onClick={props.onNext}
        >
          Далее: письмо
        </button>
      </div>
    </section>
  );
};

export default AudienceStep;
