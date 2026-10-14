import { languagesWord } from './copy';
import { useState } from 'react';
import LetterStep from './LetterStep';
import LetterPreview from './LetterPreview';
import {
  cx,
  draftProblem,
  emptyDraft,
  languageName,
  renderLocalPreview,
  type LetterDraft,
  type LetterLocale,
} from './localModel';
import e from './emailCampaign.module.css';

export default function App() {
  const [step, setStep] = useState<2 | 3>(2);
  const [drafts, setDrafts] = useState<LetterDraft[]>([emptyDraft('ru')]);
  const [defaultLocale, setDefaultLocale] = useState<LetterLocale>('ru');
  const [activeLocale, setActiveLocale] = useState<LetterLocale>('ru');
  const [reviewed, setReviewed] = useState<Record<string, string>>({});
  const problems = Object.fromEntries(
    drafts.map((draft) => [draft.locale, draftProblem(draft)]),
  );
  const active =
    drafts.find((draft) => draft.locale === activeLocale) ?? drafts[0]!;

  const addDraft = (locale: LetterLocale) => {
    setDrafts((all) =>
      all.some((draft) => draft.locale === locale)
        ? all
        : [
            ...all,
            {
              ...emptyDraft(locale),
              html:
                all.find((draft) => draft.locale === defaultLocale)?.html ?? '',
            },
          ],
    );
    setActiveLocale(locale);
  };
  const removeDraft = (locale: LetterLocale) => {
    const rest = drafts.filter((draft) => draft.locale !== locale);
    if (!rest.length) return;
    setDrafts(rest);
    if (defaultLocale === locale) setDefaultLocale(rest[0]!.locale);
    if (activeLocale === locale) setActiveLocale(rest[0]!.locale);
  };
  const review = () => {
    if (drafts.some((draft) => draftProblem(draft))) return;
    setReviewed((current) => ({
      ...current,
      [active.locale]: JSON.stringify(active),
    }));
    setStep(3);
  };

  return (
    <div className="admin_content_wrap admin_content_wrap_distribution">
      <header className="admin-header">
        <h1>Рассылка</h1>
      </header>
      <div className="admin_filters">
        <div className="admin_filters_links">
          <span className="admin_filters_link admin_filters_link_active">
            На почту
          </span>
          <button className="admin_filters_link" disabled>
            Мобила
          </button>
        </div>
      </div>
      <div className={e.page}>
        <header className={e.pageHead}>
          <div>
            <h2 className={e.pageTitle}>Новая рассылка</h2>
          </div>
        </header>
        <div className={e.composer}>
          <div className={e.main}>
            <ol className={e.stepper}>
              {[
                { n: 1, title: 'Кому', detail: 'Трейдеры' },
                {
                  n: 2,
                  title: 'Письмо',
                  detail: `${drafts.length} ${languagesWord(drafts.length)}${drafts.some((draft) => draftProblem(draft)) ? ' · не заполнено' : ''}`,
                },
                {
                  n: 3,
                  title: 'Проверка и отправка',
                  detail: 'предпросмотр и тест',
                },
              ].map((item) => (
                <li key={item.n}>
                  <button
                    type="button"
                    className={cx(
                      e.stepButton,
                      step === item.n && e.stepCurrent,
                    )}
                    disabled={
                      item.n === 1 ||
                      (item.n === 3 &&
                        drafts.some((draft) => draftProblem(draft)))
                    }
                    aria-current={step === item.n ? 'step' : undefined}
                    onClick={() => (item.n === 2 ? setStep(2) : review())}
                  >
                    <span className={e.stepNum}>{item.n}</span>
                    <span className={e.stepText}>
                      <span className={e.stepTitle}>{item.title}</span>
                      <span className={e.stepDetail}>{item.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div hidden={step !== 2}>
              <LetterStep
                drafts={drafts}
                activeLocale={activeLocale}
                defaultLocale={defaultLocale}
                byLanguage={[]}
                reach={[]}
                problems={problems}
                onActive={setActiveLocale}
                onChange={(locale, patch) =>
                  setDrafts((all) =>
                    all.map((draft) =>
                      draft.locale === locale ? { ...draft, ...patch } : draft,
                    ),
                  )
                }
                onAdd={addDraft}
                onRemove={removeDraft}
                onMakeDefault={setDefaultLocale}
                onBack={() => {}}
                onNext={review}
              />
            </div>
            {step === 3 && (
              <section className={e.card} aria-labelledby="review-title">
                <div className={e.cardHead}>
                  <h3 id="review-title" className={e.cardTitle}>
                    Проверка и отправка
                  </h3>
                </div>
                {drafts.length > 1 && (
                  <div
                    className={e.versions}
                    role="tablist"
                    aria-label="Версии письма"
                  >
                    {drafts.map((draft) => (
                      <button
                        type="button"
                        key={draft.locale}
                        role="tab"
                        aria-selected={draft.locale === activeLocale}
                        className={cx(
                          e.version,
                          draft.locale === activeLocale && e.versionActive,
                        )}
                        onClick={() => {
                          setActiveLocale(draft.locale);
                          setReviewed((current) => ({
                            ...current,
                            [draft.locale]: JSON.stringify(draft),
                          }));
                        }}
                      >
                        {languageName(draft.locale)}
                        {draft.locale === defaultLocale && (
                          <span className={e.badge}>основная</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <LetterPreview
                  preview={renderLocalPreview(active)}
                  stale={false}
                />
                <div className={e.stepFooter}>
                  <button
                    type="button"
                    className={cx(e.btn, e.btnGhost)}
                    onClick={() => setStep(2)}
                  >
                    Назад
                  </button>
                  <div className={e.footerEnd}>
                    <button
                      type="button"
                      className={cx(e.btn, e.btnPrimary)}
                      disabled
                    >
                      Запустить рассылку
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
          <aside className={e.aside} aria-label="Сводка рассылки">
            <div className={e.asideBlock}>
              <span className={e.asideLabel}>Версии письма</span>
              <ul className={e.checklist}>
                {drafts.map((draft) => {
                  const checked =
                    reviewed[draft.locale] === JSON.stringify(draft);
                  return (
                    <li
                      key={draft.locale}
                      className={
                        !problems[draft.locale] && checked
                          ? e.checkOk
                          : e.checkTodo
                      }
                    >
                      {languageName(draft.locale)}
                      {draft.locale === defaultLocale
                        ? ' (основная)'
                        : ''} —{' '}
                      {problems[draft.locale] ??
                        (checked ? 'проверена' : 'нужен предпросмотр')}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
