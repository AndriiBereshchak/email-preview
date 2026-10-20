import { useEffect, useRef, useState } from 'react';
import {
  readAppearanceImage,
  releaseEmailImage,
} from '../utils/appearanceImage';

export function useImageUpload(
  onChange: (src: string) => void,
  keepTarget = false,
) {
  const request = useRef(0);
  const latest = useRef(onChange);
  latest.current = onChange;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const cancel = () => {
    request.current++;
    setLoading(false);
    setError('');
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const current = ++request.current;
    const commit = keepTarget ? latest.current : null;
    setLoading(true);
    setError('');
    try {
      const src = await readAppearanceImage(file);
      if (current === request.current) (commit ?? latest.current)(src);
      else releaseEmailImage(src);
    } catch (failure) {
      if (current === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Не удалось загрузить изображение',
        );
    } finally {
      if (current === request.current) setLoading(false);
    }
  };
  return { loading, error, upload, cancel };
}
