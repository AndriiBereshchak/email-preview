import { appearanceColor } from './appearanceModel';
export function letterLinkUrl(value: string): string | null {
  const url = value.trim();
  if (!/^(https?:\/\/|mailto:)/i.test(url) || /[\r\n]/.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'mailto:' && !parsed.pathname.trim()) return null;
    return url;
  } catch {
    return null;
  }
}
export function letterButtonCss(value: {
  size: 'small' | 'medium' | 'large';
  radius: number;
  background: string;
}): string {
  const sizes = {
    small: [14, 8, 16],
    medium: [16, 12, 24],
    large: [20, 16, 32],
  };
  const [font, vertical, horizontal] = sizes[value.size] || sizes.medium;
  return `display:inline-block;background-color:${appearanceColor(value.background, '#2e7a55')};border-radius:${Math.max(0, Math.min(48, value.radius))}px;font-size:${font}px;padding:${vertical}px ${horizontal}px;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere;line-height:1.4;`;
}
