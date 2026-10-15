import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type SunEditorCore from 'suneditor/src/lib/core';
import {
  linkValue,
  saveLetterLink,
  type LinkKind,
  type LetterLinkValue,
} from '../../utils/letterLink';
import LetterLinkDialog from './LetterLinkDialog';
import e from '../emailCampaign.module.css';

export default function LinkControls({
  editor,
  onChange,
  linkColor,
  toolbarTarget,
}: {
  editor: SunEditorCore;
  onChange: (html: string) => void;
  linkColor: string;
  toolbarTarget?: HTMLElement | null;
}) {
  const root = editor.core.context.element.wysiwyg as HTMLElement;
  const selection = useRef<Range | null>(null);
  const [dialog, setDialog] = useState<{
    initial: LetterLinkValue;
    range: Range | null;
    anchor: HTMLAnchorElement | null;
  } | null>(null);
  useEffect(() => {
    const capture = () => {
      const current = document.getSelection();
      const range = current?.rangeCount ? current.getRangeAt(0) : null;
      if (
        range &&
        root.contains(range.startContainer) &&
        root.contains(range.endContainer)
      )
        selection.current = range.cloneRange();
    };
    const click = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a')
          : null;
      if (!anchor || !root.contains(anchor) || anchor.querySelector('img'))
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setDialog({
        initial: linkValue(
          anchor,
          anchor.hasAttribute('data-email-button') ? 'button' : 'link',
          '',
          linkColor,
        ),
        range: null,
        anchor,
      });
    };
    const openSelected = (event: Event) => {
      const { kind, range } = (
        event as CustomEvent<{ kind: LinkKind; range: Range }>
      ).detail;
      setDialog({
        initial: linkValue(null, kind, range.toString(), linkColor),
        range,
        anchor: null,
      });
    };
    document.addEventListener('selectionchange', capture);
    root.addEventListener('click', click, true);
    root.addEventListener('email-link-edit', openSelected);
    return () => {
      document.removeEventListener('selectionchange', capture);
      root.removeEventListener('click', click, true);
      root.removeEventListener('email-link-edit', openSelected);
    };
  }, [root, linkColor]);
  const open = (kind: LinkKind) => {
    const range = selection.current?.cloneRange() || null;
    setDialog({
      initial: linkValue(null, kind, range?.toString() || '', linkColor),
      range,
      anchor: null,
    });
  };
  return (
    <>
      {toolbarTarget &&
        createPortal(
          <div
            className={e.linkTools}
            role="group"
            aria-label="Кнопки и ссылки"
          >
            <button
              type="button"
              className={e.linkBtn}
              onClick={() => open('button')}
            >
              + Кнопка
            </button>
            <button
              type="button"
              className={e.linkBtn}
              onClick={() => open('link')}
            >
              + Ссылка
            </button>
          </div>,
          toolbarTarget,
        )}
      {dialog && (
        <LetterLinkDialog
          initial={dialog.initial}
          onClose={() => setDialog(null)}
          onSave={(value) => {
            editor.core.history.push(false);
            saveLetterLink(root, value, dialog.range, dialog.anchor);
            editor.core.history.push(false);
            selection.current = null;
            onChange(editor.getContents(false));
            setDialog(null);
          }}
        />
      )}
    </>
  );
}
