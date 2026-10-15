import { useEffect, useRef } from 'react';
import type SunEditorCore from 'suneditor/src/lib/core';
import { alignImage, imageUnit, moveImage } from '../../utils/imageEditing';
import { attachImageDragging } from '../../utils/imageDragging';
import { attachImageMouseEditing } from '../../utils/imageMouseEditing';
import e from '../emailCampaign.module.css';

export default function ImageControls({ editor, onChange }: {
  editor: SunEditorCore;
  onChange: (html: string) => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const root = editor.core.context.element.wysiwyg as HTMLElement;
    const before = () => editor.core.history.push(false);
    const commit = () => {
      editor.core.controllersOff();
      editor.core.history.push(false);
      onChangeRef.current(editor.getContents(false));
    };
    const handles = attachImageMouseEditing(root, {
      overlayClass: e.imageSelection,
      cornerClass: e.imageResizeCorner,
      spacingClass: e.imageSpacingHandle,
      menuClass: e.imageContextMenu,
      onBeforeChange: before,
      onChange: commit,
      onAlign: (image, alignment) => {
        before();
        alignImage(root, image, alignment);
        commit();
      },
      onHistory: (action) => {
        editor.core.history[action]();
        onChangeRef.current(editor.getContents(false));
      },
      canHistory: (action) => action === 'undo'
        ? editor.core.history.getCurrentIndex() > 0
        : editor.core.history.getCurrentIndex() < editor.core.history.stack.length - 1,
    });
    const detachDragging = attachImageDragging(root, {
      markerClass: e.imageDropMarker,
      onSelect: handles.select,
      onMove: (image, destination, alignment) => {
        before();
        moveImage(root, image, destination);
        if (alignment) alignImage(root, image, alignment);
        const unit = imageUnit(root, image)!;
        const parent = unit.parentNode!;
        const index = Array.prototype.indexOf.call(parent.childNodes, unit);
        editor.core.setRange(parent, index, parent, index);
        commit();
        handles.select(image);
      },
    });
    return () => { detachDragging(); handles.destroy(); };
  }, [editor]);
  return null;
}
