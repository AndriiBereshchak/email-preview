import { useState } from 'react';
import {
  cx,
  languageName,
  type LetterDraft,
  type LetterLocale,
} from '../../utils/localModel';
import type { EmailAppearance } from '../../utils/appearanceModel';
import AppearanceSettings from './AppearanceSettings';
import VersionEditor from './VersionEditor';
import e from '../emailCampaign.module.css';
interface Props {
  drafts: LetterDraft[];
  activeLocale: LetterLocale;
  defaultLocale: LetterLocale;
  appearance: EmailAppearance;
  onActive: (locale: LetterLocale) => void;
  onChange: (locale: LetterLocale, html: string) => void;
  onAppearance: (value: EmailAppearance) => void;
  onBack: () => void;
  onNext: () => void;
}
export default function DesignStep(props: Props) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const active =
    props.drafts.find((draft) => draft.locale === props.activeLocale) ??
    props.drafts[0];
  return (
    <section className={e.card} aria-labelledby="design-title">
      <div className={e.cardHead}>
        <h3 id="design-title" className={e.cardTitle}>
          Оформление
        </h3>
        <p className={e.cardLead}>
          Настройте общий стиль письма и расположение картинок. Текст
          редактируется на шаге «Письмо».
        </p>
      </div>
      <div className={e.designColumns}>
        <AppearanceSettings
          value={props.appearance}
          onChange={props.onAppearance}
        />
        <div className={e.designCanvas}>
          <div className={e.versions} role="tablist" aria-label="Язык макета">
            {props.drafts.map((draft) => (
              <button
                type="button"
                key={draft.locale}
                role="tab"
                aria-selected={draft.locale === active.locale}
                className={cx(
                  e.version,
                  draft.locale === active.locale && e.versionActive,
                )}
                onClick={() => props.onActive(draft.locale)}
              >
                {languageName(draft.locale)}
                {draft.locale === props.defaultLocale && (
                  <span className={e.badge}>основная</span>
                )}
              </button>
            ))}
          </div>
          <div
            className={e.segmented}
            role="tablist"
            aria-label="Размер макета"
          >
            {(['desktop', 'mobile'] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                role="tab"
                aria-selected={view === mode}
                className={cx(e.segment, view === mode && e.segmentActive)}
                onClick={() => setView(mode)}
              >
                {mode === 'desktop' ? 'Компьютер' : 'Телефон'}
              </button>
            ))}
          </div>
          <div
            className={e.designStage}
            style={{ backgroundColor: props.appearance.pageBackground }}
          >
            <div
              style={{
                width: view === 'mobile' ? 375 : props.appearance.width,
                maxWidth: '100%',
                margin: '0 auto',
              }}
            >
              <VersionEditor
                key={active.locale}
                initialHtml={active.html}
                mode="layout"
                appearance={props.appearance}
                onChange={(html) => props.onChange(active.locale, html)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={e.stepFooter}>
        <button
          type="button"
          className={cx(e.btn, e.btnGhost)}
          onClick={props.onBack}
        >
          Назад: письмо
        </button>
        <button
          type="button"
          className={cx(e.btn, e.btnPrimary)}
          onClick={props.onNext}
        >
          Далее: проверка
        </button>
      </div>
    </section>
  );
}
