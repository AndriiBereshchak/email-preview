import {
  cx as clsx,
  type LetterLocale,
  type LetterDraft,
} from '../../utils/localModel';
import {
  formatCount,
  languageName,
  languagesWord,
  targetLabel,
  type CampaignTarget,
} from '../../utils/audienceModel';
import e from '../emailCampaign.module.css';

interface Props {
  target: CampaignTarget;
  count: number | null;
  everyone: boolean;
  problem: string | null;
  filterLines: string[];
  byLanguage: Array<{ locale: string; count: number }>;
  drafts: LetterDraft[];
  defaultLocale: LetterLocale;
  problems: Record<string, string | null>;
  isPreviewed: (locale: string) => boolean;
}

const SHOWN_LANGUAGES = 6;

const SummaryAside = (props: Props) => {
  const locales = new Set<string>(props.drafts.map((draft) => draft.locale));
  const top = props.byLanguage.slice(0, SHOWN_LANGUAGES);
  const rest = props.byLanguage.slice(SHOWN_LANGUAGES);
  const largest = Math.max(1, ...props.byLanguage.map((row) => row.count));

  return (
    <aside className={e.aside} aria-label="Сводка рассылки">
      <div className={e.asideBlock}>
        <span className={e.asideLabel}>
          Получатели · {targetLabel(props.target)}
        </span>
        <span className={e.bigCount} aria-live="polite">
          {props.problem
            ? '—'
            : props.count === null
              ? '…'
              : `до ${formatCount(props.count)}`}
        </span>
        <p className={e.asideText}>
          {props.problem ??
            'Демонстрационные количество и языки получателей. Реальный состав определяется сервером.'}
        </p>
        {props.filterLines.length > 0 && (
          <ul className={e.filterList}>
            {props.filterLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {props.everyone && !props.problem && (
          <p className={e.warning}>
            В демонстрационных данных выбрана вся аудитория. Настройки фильтров
            сохраняются в форме, но не меняют моковые данные.
          </p>
        )}
      </div>

      {top.length > 0 && (
        <div className={e.asideBlock}>
          <span className={e.asideLabel}>Языки получателей</span>
          <ul className={e.bars}>
            {top.map((row) => {
              const covered = locales.has(row.locale);
              return (
                <li
                  key={row.locale}
                  className={clsx(e.bar, !covered && e.barMuted)}
                >
                  <span className={e.barName}>
                    {languageName(row.locale)}
                    {!covered && (
                      <em>
                        {' '}
                        → {languageName(props.defaultLocale).toLowerCase()}
                      </em>
                    )}
                  </span>
                  <span className={e.barValue}>{formatCount(row.count)}</span>
                  <span className={e.barTrack} aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.max(2, Math.round((row.count / largest) * 100))}%`,
                      }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          {rest.length > 0 && (
            <p className={e.asideText}>
              И ещё {rest.length} {languagesWord(rest.length)} —{' '}
              {formatCount(rest.reduce((sum, row) => sum + row.count, 0))}{' '}
              получателей
            </p>
          )}
        </div>
      )}

      <div className={e.asideBlock}>
        <span className={e.asideLabel}>Версии письма</span>
        <ul className={e.checklist}>
          {props.drafts.map((draft) => {
            const problem = props.problems[draft.locale];
            const previewed = props.isPreviewed(draft.locale);
            return (
              <li
                key={draft.locale}
                className={!problem && previewed ? e.checkOk : e.checkTodo}
              >
                {languageName(draft.locale)}
                {draft.locale === props.defaultLocale
                  ? ' (основная)'
                  : ''} —{' '}
                {problem ?? (previewed ? 'проверена' : 'нужен предпросмотр')}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default SummaryAside;
