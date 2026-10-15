export const EMAIL_FONTS = ['Arial', 'Georgia', 'Verdana'] as const;
export interface EmailAppearance {
  pageBackground: string;
  background: string;
  textColor: string;
  linkColor: string;
  width: number;
  padding: number;
  fontFamily: (typeof EMAIL_FONTS)[number];
  fontSize: number;
  lineHeight: number;
  headerEnabled: boolean;
  headerBackground: string;
  logoSrc: string;
  logoName: string;
  logoWidth: number;
  headerHeight: number;
  headerText: string;
  footerEnabled: boolean;
  footerBackground: string;
  footerText: string;
}
export const DEFAULT_APPEARANCE: EmailAppearance = {
  pageBackground: '#e9edf3',
  background: '#ffffff',
  textColor: '#20252b',
  linkColor: '#2e7a55',
  width: 640,
  padding: 24,
  fontFamily: 'Arial',
  fontSize: 16,
  lineHeight: 1.6,
  headerEnabled: false,
  headerBackground: '#23293b',
  logoSrc: '',
  logoName: '',
  logoWidth: 160,
  headerHeight: 48,
  headerText: '',
  footerEnabled: false,
  footerBackground: '#ffffff',
  footerText: '',
};
const color = (value: string | undefined, fallback: string) =>
  value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const bounded = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
export function normalizeAppearance(
  input: Partial<EmailAppearance> = {},
): EmailAppearance {
  const d = DEFAULT_APPEARANCE;
  return {
    pageBackground: color(input.pageBackground, d.pageBackground),
    background: color(input.background, d.background),
    textColor: color(input.textColor, d.textColor),
    linkColor: color(input.linkColor, d.linkColor),
    width: Math.round(bounded(input.width, d.width, 320, 800)),
    padding: Math.round(bounded(input.padding, d.padding, 0, 64)),
    fontFamily: EMAIL_FONTS.includes(input.fontFamily!)
      ? input.fontFamily!
      : d.fontFamily,
    fontSize: bounded(input.fontSize, d.fontSize, 12, 32),
    lineHeight: bounded(input.lineHeight, d.lineHeight, 1, 2.5),
    headerEnabled: input.headerEnabled === true,
    headerBackground: color(input.headerBackground, d.headerBackground),
    logoSrc:
      typeof input.logoSrc === 'string' &&
      /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(
        input.logoSrc,
      )
        ? input.logoSrc
        : '',
    logoName: typeof input.logoName === 'string' ? input.logoName : '',
    logoWidth: Math.round(bounded(input.logoWidth, d.logoWidth, 16, 800)),
    headerHeight: Math.round(
      bounded(input.headerHeight, d.headerHeight, 48, 1000),
    ),
    headerText: typeof input.headerText === 'string' ? input.headerText : '',
    footerEnabled: input.footerEnabled === true,
    footerBackground: color(input.footerBackground, d.footerBackground),
    footerText: typeof input.footerText === 'string' ? input.footerText : '',
  };
}
export const appearanceBodyCss = (appearance: EmailAppearance) => {
  const a = normalizeAppearance(appearance);
  return `--email-content-padding:${a.padding}px;padding:${a.padding}px;font-family:${a.fontFamily},${a.fontFamily === 'Georgia' ? 'serif' : 'sans-serif'};font-size:${a.fontSize}px;line-height:${a.lineHeight};color:${a.textColor};background-color:${a.background};overflow-wrap:anywhere;`;
};
