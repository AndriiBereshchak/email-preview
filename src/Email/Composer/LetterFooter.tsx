import type { EmailAppearance } from '../../utils/appearanceModel';
import VersionEditor from './VersionEditor';

export default function LetterFooter({
  appearance,
  onChange,
}: {
  appearance: EmailAppearance;
  onChange: (value: EmailAppearance) => void;
}) {
  if (!appearance.footerEnabled) return null;
  return (
    <div
      style={{
        padding: appearance.padding,
        backgroundColor: appearance.footerBackground,
      }}
    >
      <VersionEditor
        mode="decoration"
        label="Текст футера"
        initialHtml={appearance.footerText}
        appearance={{
          ...appearance,
          padding: 0,
          background: appearance.footerBackground,
        }}
        onChange={(footerText) => onChange({ ...appearance, footerText })}
      />
    </div>
  );
}
