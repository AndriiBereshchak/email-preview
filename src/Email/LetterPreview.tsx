import { copy } from '../utils/copy';
import { cx as clsx, type LetterPreviewResult } from '../utils/localModel';
import { useState } from 'react';
import e from './emailCampaign.module.css';

type View = 'desktop' | 'mobile' | 'text';

const VIEWS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'desktop', label: 'Компьютер' },
  { value: 'mobile', label: 'Телефон' },
  { value: 'text', label: 'Текстовая версия' },
];

interface Props {
  preview: LetterPreviewResult;
  stale: boolean;
}

const LetterPreview = ({ preview, stale }: Props) => {
  const [view, setView] = useState<View>('desktop');

  return (
    <div className={e.preview}>
      <div className={e.previewBar}>
        <div className={e.previewSubject}>
          <span className={e.fieldLabel}>Тема во входящих</span>
          <strong>{preview.subject}</strong>
        </div>
        <div
          className={e.segmented}
          role="tablist"
          aria-label="Вид предпросмотра"
        >
          {VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={view === option.value}
              className={clsx(
                e.segment,
                view === option.value && e.segmentActive,
              )}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {stale && (
        <p className={e.staleNote}>
          Письмо изменилось после предпросмотра — обновите его, чтобы запустить
          рассылку.
        </p>
      )}

      <div className={clsx(stale && e.stale)}>
        {view === 'text' ? (
          <pre className={e.previewText}>{preview.text}</pre>
        ) : (
          <div className={e.previewStage}>
            <iframe
              title="Предпросмотр письма"
              sandbox=""
              srcDoc={preview.html}
              className={e.previewFrame}
              style={{ width: view === 'desktop' ? 640 : 375 }}
            />
          </div>
        )}
      </div>

      <p className={e.fieldHint}>{copy.previewHint}</p>
    </div>
  );
};

export default LetterPreview;
