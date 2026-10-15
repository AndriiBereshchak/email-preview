import { toast } from 'react-hot-toast';
import { copy } from '../../utils/copy';
import { useEffect, useRef, useState } from 'react';
import {
  cx as clsx,
  LETTER_LANGUAGES,
  formatCount,
  isLetterLocale,
  languageName,
  letterImageHtml,
  uncoveredLanguages,
  type LetterLocale,
  type LetterDraft,
  type EmailImage,
  type VersionReach,
} from '../../utils/localModel';
import { CustomInput } from '../../parts/CustomInput/CustomInput';
import { Field } from '../Field';
import VersionEditor, { type EditorHandle } from './VersionEditor';
import EmailImages from './EmailImages';
import e from '../emailCampaign.module.css';

interface Props {
  drafts: LetterDraft[];
  activeLocale: LetterLocale;
  defaultLocale: LetterLocale;
  byLanguage: Array<{ locale: string; count: number }>;
  reach: VersionReach[];
  problems: Record<string, string | null>;
  onActive: (locale: LetterLocale) => void;
  onChange: (locale: LetterLocale, patch: Partial<LetterDraft>) => void;
  onAdd: (locale: LetterLocale) => void;
  onRemove: (locale: LetterLocale) => void;
  onMakeDefault: (locale: LetterLocale) => void;
  onBack: () => void;
  onNext: () => void;
}

const reachLine = (
  reach: VersionReach | undefined,
  isDefault: boolean,
): string => {
  if (!reach) return '';
  const fallback = reach.fallback.reduce((sum, row) => sum + row.count, 0);
  if (isDefault && fallback > 0) {
    return `Получат до ${formatCount(reach.total)}: ${formatCount(reach.own)} читают на этом языке и ${formatCount(fallback)} — на языках без своей версии`;
  }
  return `Получат до ${formatCount(reach.total)} — те, кто читает на этом языке`;
};

const LetterStep = (props: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const editors = useRef(new Map<LetterLocale, EditorHandle>());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const locales = props.drafts.map((draft) => draft.locale);
  const active =
    props.drafts.find((draft) => draft.locale === props.activeLocale) ??
    props.drafts[0]!;
  const uncovered = uncoveredLanguages(props.byLanguage, locales);
  const quickAdd = uncovered
    .filter((row) => isLetterLocale(row.locale))
    .slice(0, 3);
  const addable = LETTER_LANGUAGES.filter(
    (language) => !locales.includes(language.value),
  )
    .map((language) => ({
      ...language,
      count:
        props.byLanguage.find((row) => row.locale === language.value)?.count ??
        0,
    }))
    .sort((a, b) => b.count - a.count);
  const notReady = props.drafts.filter((draft) => props.problems[draft.locale]);
  const largestUncovered = uncovered[0];
  const coveredTotal = props.reach
    .filter((row) => row.locale !== props.defaultLocale)
    .reduce((sum, row) => sum + row.total, 0);
  const mainTotal =
    props.reach.find((row) => row.locale === props.defaultLocale)?.total ?? 0;
  const warnLanguage =
    largestUncovered &&
    largestUncovered.count > (mainTotal + coveredTotal) * 0.1;

  const insertImage = (image: EmailImage) => {
    const editor = editors.current.get(active.locale);
    if (!editor) {
      toast.error('Редактор ещё загружается — попробуйте через секунду');
      return;
    }
    editor.insertHTML(letterImageHtml(image));
    toast.success(
      `«${image.name}» — в версии: ${languageName(active.locale).toLowerCase()}`,
    );
  };

  return (
    <section className={e.card} aria-labelledby="letter-title">
      <div className={e.cardHead}>
        <h3 id="letter-title" className={e.cardTitle}>
          Письмо
        </h3>
        <p className={e.cardLead}>
          Каждый получит версию на языке своего интерфейса. У кого своей версии
          нет — получит основную. Под языком — сколько человек его получат.
        </p>
      </div>

      <div className={e.versions} role="tablist" aria-label="Версии письма">
        {props.drafts.map((draft) => {
          const reach = props.reach.find((row) => row.locale === draft.locale);
          return (
            <button
              key={draft.locale}
              type="button"
              role="tab"
              aria-selected={draft.locale === active.locale}
              className={clsx(
                e.version,
                draft.locale === active.locale && e.versionActive,
              )}
              onClick={() => props.onActive(draft.locale)}
            >
              <span
                className={clsx(
                  e.versionState,
                  !props.problems[draft.locale] && e.versionReady,
                )}
                aria-hidden="true"
              />
              {languageName(draft.locale)}
              {draft.locale === props.defaultLocale && (
                <span className={e.badge}>основная</span>
              )}
              {reach && (
                <span className={e.versionCount}>
                  {formatCount(reach.total)}
                </span>
              )}
            </button>
          );
        })}
        {addable.length > 0 && (
          <div className={e.addLanguage} ref={menuRef}>
            <button
              type="button"
              className={clsx(e.btn, e.btnGhost, e.btnSmall)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              + Добавить язык
            </button>
            {menuOpen && (
              <div className={e.menu} role="menu">
                {addable.map((language) => (
                  <button
                    key={language.value}
                    type="button"
                    role="menuitem"
                    className={e.menuItem}
                    onClick={() => {
                      props.onAdd(language.value);
                      setMenuOpen(false);
                    }}
                  >
                    <span>{language.label}</span>
                    <span>
                      {language.count
                        ? formatCount(language.count)
                        : 'нет в аудитории'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {uncovered.length > 0 && (
        <div className={clsx(e.callout, warnLanguage && e.calloutWarn)}>
          <p>
            Основную версию ({languageName(props.defaultLocale)}) получат и те,
            у кого нет своей:{' '}
            {uncovered
              .slice(0, 6)
              .map(
                (row) =>
                  `${languageName(row.locale)} — ${formatCount(row.count)}`,
              )
              .join(', ')}
            {uncovered.length > 6 ? ' и другие' : ''}.
          </p>
          {quickAdd.length > 0 && (
            <div className={e.inlineActions}>
              {quickAdd.map((row) => (
                <button
                  key={row.locale}
                  type="button"
                  className={e.linkBtn}
                  onClick={() => props.onAdd(row.locale as LetterLocale)}
                >
                  + Версия на {languageName(row.locale).toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {props.drafts.map((draft) => (
        <div
          key={draft.locale}
          hidden={draft.locale !== active.locale}
          className={e.versionForm}
        >
          <div className={e.versionTools}>
            <span className={e.meta}>
              {reachLine(
                props.reach.find((row) => row.locale === draft.locale),
                draft.locale === props.defaultLocale,
              )}
            </span>
            <div className={e.inlineActions}>
              {draft.locale !== props.defaultLocale && (
                <button
                  type="button"
                  className={e.linkBtn}
                  onClick={() => props.onMakeDefault(draft.locale)}
                >
                  Сделать основной
                </button>
              )}
              {props.drafts.length > 1 && (
                <button
                  type="button"
                  className={clsx(e.linkBtn, e.dangerLink)}
                  onClick={() => props.onRemove(draft.locale)}
                >
                  Удалить версию
                </button>
              )}
            </div>
          </div>
          <div className={e.grid2}>
            <Field label="Тема письма">
              <CustomInput
                value={draft.subject}
                onChange={(event) =>
                  props.onChange(draft.locale, { subject: event.target.value })
                }
                placeholder={`Тема на языке: ${languageName(draft.locale).toLowerCase()}`}
              />
            </Field>
            <Field
              label={
                <>
                  Прехедер<em>необязательно</em>
                </>
              }
            >
              <CustomInput
                value={draft.preheader}
                onChange={(event) =>
                  props.onChange(draft.locale, {
                    preheader: event.target.value,
                  })
                }
                placeholder="Строка рядом с темой во входящих"
              />
            </Field>
          </div>
          <VersionEditor
            initialHtml={draft.html}
            onChange={(html) => props.onChange(draft.locale, { html })}
            onEditor={(editor) => editors.current.set(draft.locale, editor)}
          />
          <p className={e.fieldHint}>{copy.letterContentHint}</p>
        </div>
      ))}

      <EmailImages onInsert={insertImage} />

      <div className={e.stepFooter}>
        <button
          type="button"
          className={clsx(e.btn, e.btnGhost)}
          onClick={props.onBack}
        >
          Назад
        </button>
        <div className={e.footerEnd}>
          {notReady.length > 0 && (
            <span className={e.footerNote}>
              Осталось:{' '}
              {notReady
                .map(
                  (draft) =>
                    `${languageName(draft.locale)} — ${props.problems[draft.locale]}`,
                )
                .join(', ')}
            </span>
          )}
          <button
            type="button"
            className={clsx(e.btn, e.btnPrimary)}
            disabled={notReady.length > 0}
            onClick={props.onNext}
          >
            Далее: проверка
          </button>
        </div>
      </div>
    </section>
  );
};

export default LetterStep;
