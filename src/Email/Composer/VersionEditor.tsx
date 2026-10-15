import { useCallback, useRef } from 'react';
import SunEditor from 'suneditor-react';
import type SunEditorCore from 'suneditor/src/lib/core';
import 'suneditor/dist/css/suneditor.min.css';
import e from '../emailCampaign.module.css';

export interface EditorHandle {
  insertHTML: (html: string) => void;
}
interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
  onEditor: (editor: EditorHandle) => void;
}

export default function VersionEditor({
  initialHtml,
  onChange,
  onEditor,
}: Props) {
  const seed = useRef(initialHtml);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  const seedEditor = useCallback((editor: SunEditorCore) => {
    if (seed.current) editor.setContents(seed.current);
    onEditorRef.current({
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
      },
    });
  }, []);
  const handleChange = useCallback(
    (html: string) => onChangeRef.current(html),
    [],
  );

  return (
    <div className={e.letterEditor}>
      <SunEditor
        getSunEditorInstance={seedEditor}
        onChange={handleChange}
        onBlur={(_event, contents) => handleChange(contents)}
        height="390px"
        setOptions={{
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
          imageAccept: '.png,.jpg,.jpeg,.gif,.webp',
          imageUploadSizeLimit: 15 * 1024 * 1024,
          resizingBar: false,
          showPathLabel: false,
        }}
      />
    </div>
  );
}
