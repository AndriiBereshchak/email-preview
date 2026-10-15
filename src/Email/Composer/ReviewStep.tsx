import type { EmailAppearance } from '../../utils/appearanceModel';
import { useEffect, useRef, useState } from 'react';
import {
  cx as clsx,
  formatCount,
  languageName,
  previewKey,
  renderLocalPreview,
  type LetterDraft as CampaignLetter,
  type LetterLocale,
  type LetterPreviewResult,
} from '../../utils/localModel';
import { recipientsWord, type CampaignTarget } from '../../utils/audienceModel';
import { Switch } from '../../parts/Switch/Switch';
import LetterPreview from '../LetterPreview';
import e from '../emailCampaign.module.css';

export interface PreviewState {
  key: string;
  data: LetterPreviewResult;
}

interface Props {
  target: CampaignTarget;
  appearance: EmailAppearance;
  count: number | null;
  letters: CampaignLetter[];
  defaultLocale: LetterLocale;
  activeLocale: LetterLocale;
  onActive: (locale: LetterLocale) => void;
  previews: Record<string, PreviewState>;
  onPreviewed: (locale: string, state: PreviewState) => void;
  skipUnengaged: boolean;
  onSkipUnengaged: (skip: boolean) => void;
  launchBlocker: string | null;
  launching: boolean;
  onBack: () => void;
  onLaunch: () => void;
}

const ReviewStep = (props: Props) => {
  const onPreviewed = useRef(props.onPreviewed);
  onPreviewed.current = props.onPreviewed;
  const [failedPreview, setFailedPreview] = useState<{
    key: string;
    message: string;
  } | null>(null);

  const letter =
    props.letters.find((item) => item.locale === props.activeLocale) ??
    props.letters[0]!;
  const key = previewKey(props.target, letter, props.appearance);
  const preview = props.previews[letter.locale];
  const fresh = preview?.key === key;
  const failure = failedPreview?.key === key ? failedPreview.message : null;
  const previewed = props.letters.filter(
    (item) =>
      props.previews[item.locale]?.key ===
      previewKey(props.target, item, props.appearance),
  ).length;

  useEffect(() => {
    if (fresh) return;
    let cancelled = false;
    setFailedPreview(null);
    Promise.resolve()
      .then(() => renderLocalPreview(letter, props.appearance))
      .then((data) => {
        if (!cancelled) onPreviewed.current(letter.locale, { key, data });
      })
      .catch((err) => {
        if (!cancelled) {
          setFailedPreview({
            key,
            message:
              err instanceof Error ? err.message : 'Не удалось собрать письмо',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, fresh, letter, props.appearance]);

  return (
    <section className={e.card} aria-labelledby="review-title">
      <div className={e.cardHead}>
        <h3 id="review-title" className={e.cardTitle}>
          Проверка и отправка
        </h3>
        <p className={e.cardLead}>
          Посмотрите каждую языковую версию перед запуском. Предпросмотр
          собирается локально; серверный шаблон и отправка тестовых писем пока
          не подключены.
        </p>
      </div>

      {props.letters.length > 1 && (
        <div className={e.versions} role="tablist" aria-label="Версии письма">
          {props.letters.map((item) => {
            const done =
              props.previews[item.locale]?.key ===
              previewKey(props.target, item, props.appearance);
            return (
              <button
                key={item.locale}
                type="button"
                role="tab"
                aria-selected={item.locale === letter.locale}
                className={clsx(
                  e.version,
                  item.locale === letter.locale && e.versionActive,
                )}
                onClick={() => props.onActive(item.locale)}
              >
                <span
                  className={clsx(e.versionState, done && e.versionReady)}
                  aria-hidden="true"
                />
                {languageName(item.locale)}
                {item.locale === props.defaultLocale && (
                  <span className={e.badge}>основная</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {failure ? (
        <p className={e.alert} role="alert">
          {failure}
        </p>
      ) : fresh && preview ? (
        <>
          {preview.data.notes.length > 0 && (
            <div className={e.warning} role="status">
              <strong>Не всё из редактора попало в письмо</strong>
              <ul>
                {preview.data.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          <LetterPreview preview={preview.data} stale={false} />
        </>
      ) : (
        <div className={e.previewLoading}>
          <span role="status">Собираем предпросмотр…</span>
        </div>
      )}

      <div className={clsx(e.reviewSummary, e.test)}>
        <h4 className={e.subTitle}>Перед запуском</h4>
        <ul className={e.checklist}>
          <li className={props.count ? e.checkOk : e.checkTodo}>
            {props.count
              ? `Получат до ${formatCount(props.count)} ${recipientsWord(props.target, props.count)}`
              : 'Получатели ещё не посчитаны'}
          </li>
          <li
            className={
              previewed === props.letters.length ? e.checkOk : e.checkTodo
            }
          >
            Просмотрено версий: {previewed} из {props.letters.length}
          </li>
        </ul>
        <label className={e.switchRow}>
          <Switch
            checked={props.skipUnengaged}
            onChange={(event) => props.onSkipUnengaged(event.target.checked)}
          />
          <span>
            Не отправлять тем, кто получал наши письма, но не открывал их
            полгода
          </span>
        </label>
      </div>

      <div className={e.stepFooter}>
        <button
          type="button"
          className={clsx(e.btn, e.btnGhost)}
          onClick={props.onBack}
        >
          Назад
        </button>
        <div className={e.footerEnd}>
          {props.launchBlocker && (
            <span className={e.footerNote} role="status">
              {props.launchBlocker}
            </span>
          )}
          <button
            type="button"
            className={clsx(e.btn, e.btnPrimary)}
            disabled={Boolean(props.launchBlocker) || props.launching}
            onClick={props.onLaunch}
          >
            Запустить рассылку
          </button>
        </div>
      </div>
    </section>
  );
};

export default ReviewStep;
