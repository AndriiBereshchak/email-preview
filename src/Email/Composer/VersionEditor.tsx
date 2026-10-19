import { useCallback, useEffect, useRef, useState } from 'react';
import SunEditor from 'suneditor-react';
import type SunEditorCore from 'suneditor/src/lib/core';
import 'suneditor/dist/css/suneditor.min.css';
import {
  appearanceBodyCss,
  DEFAULT_APPEARANCE,
  type EmailAppearance,
} from '../../utils/appearanceModel';
import type { CSSProperties } from 'react';
import LinkControls from './LinkControls';
import ImageControls from './ImageControls';
import e from '../emailCampaign.module.css';

export interface EditorHandle {
  insertHTML: (html: string) => void;
}
interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
  onEditor?: (editor: EditorHandle) => void;
  mode?: 'content' | 'layout' | 'decoration';
  label?: string;
  toolbarTarget?: HTMLElement | null;
  appearance?: EmailAppearance;
}

export default function VersionEditor({
  initialHtml,
  onChange,
  onEditor,
  mode = 'content',
  appearance = DEFAULT_APPEARANCE,
  label,
  toolbarTarget,
}: Props) {
  const [instance, setInstance] = useState<SunEditorCore | null>(null);
  const syncing = useRef(false);
  const lastKnownHtml = useRef(initialHtml);
  const seed = useRef(initialHtml);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  const seedEditor = useCallback((editor: SunEditorCore) => {
    setInstance(editor);
    if (seed.current) editor.setContents(seed.current);
    onEditorRef.current?.({
      insertHTML: (html) => {
        editor.core.focus();
        const range = editor.core.getRange().cloneRange();
        range.collapse(false);
        const endElement =
          range.endContainer.nodeType === Node.ELEMENT_NODE
            ? (range.endContainer as Element)
            : range.endContainer.parentElement;
        const link = endElement?.closest('a');
        if (link) range.setStartAfter(link);
        range.collapse(true);
        editor.core.setRange(
          range.startContainer,
          range.startOffset,
          range.startContainer,
          range.startOffset,
        );
        editor.insertHTML(html);
        const contents = editor.getContents(false);
        lastKnownHtml.current = contents;
        onChangeRef.current(contents);
      },
    });
  }, []);
  const handleChange = useCallback((html: string) => {
    if (syncing.current) return;
    lastKnownHtml.current = html;
    onChangeRef.current(html);
  }, []);

  useEffect(() => {
    if (instance) {
      const root = instance.core.context.element.wysiwyg as HTMLElement;
      root.contentEditable = mode === 'layout' ? 'false' : 'true';
      if (label) root.setAttribute('aria-label', label);
    }
  }, [instance, mode, label]);

  useEffect(() => {
    if (!instance || initialHtml === lastKnownHtml.current) return;
    lastKnownHtml.current = initialHtml;
    syncing.current = true;
    try {
      instance.setContents(initialHtml);
    } finally {
      syncing.current = false;
    }
  }, [initialHtml, instance]);

  return (
    <div
      className={
        mode === 'decoration'
          ? `${e.letterEditor} ${e.decorationEditor}`
          : mode === 'layout'
            ? `${e.letterEditor} ${e.layoutEditor}`
            : `${e.letterEditor} ${e.contentEditor}`
      }
      style={{ '--email-link-color': appearance.linkColor } as CSSProperties}
    >
      {instance && mode !== 'content' && (
        <LinkControls
          editor={instance}
          onChange={handleChange}
          linkColor={appearance.linkColor}
          toolbarTarget={toolbarTarget}
        />
      )}
      <SunEditor
        readOnly={mode === 'layout'}
        hideToolbar={mode !== 'content'}
        placeholder={label}
        setDefaultStyle={
          mode !== 'content' ? appearanceBodyCss(appearance) : undefined
        }
        getSunEditorInstance={seedEditor}
        onChange={handleChange}
        onBlur={(_event, contents) => handleChange(contents)}
        height={mode === 'content' ? '390px' : 'auto'}
        setOptions={{
          attributesWhitelist: {
            a: 'style|data-email-button|data-button-size',
            span: 'style',
            p: 'style',
            h1: 'style',
            h2: 'style',
            h3: 'style',
            h4: 'style',
            h5: 'style',
            h6: 'style',
          },
          buttonList: [
            ['undo', 'redo'],
            ['formatBlock', 'fontSize'],
            ['bold', 'italic', 'underline', 'strike'],
            ['fontColor', 'hiliteColor'],
            ['align', 'list'],
            ['link', 'image', 'table'],
            ['removeFormat', 'codeView'],
          ],
          defaultStyle:
            'font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;',
          imageResizing: false,
          imageAccept: '.png,.jpg,.jpeg,.gif,.webp',
          imageUploadSizeLimit: 15 * 1024 * 1024,
          resizingBar: false,
          showPathLabel: false,
        }}
      />
      {instance && mode !== 'content' && (
        <>
          {mode === 'layout' && (
            <ImageControls editor={instance} onChange={handleChange} />
          )}
        </>
      )}
    </div>
  );
}
