import LetterPreview from './LetterPreview';
import { renderLocalPreview, type LetterDraft } from './localModel';
export default function SentLetter({ letter }: { letter: LetterDraft }) {
  return <LetterPreview preview={renderLocalPreview(letter)} stale={false} />;
}
