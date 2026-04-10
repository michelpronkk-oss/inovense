export type FormatKey =
  | 'portrait'
  | 'square'
  | 'story'
  | 'facebook_cover'
  | 'linkedin_banner';

export interface Format {
  key: FormatKey;
  label: string;
  width: number;
  height: number;
}

export const FORMATS: Record<FormatKey, Format> = {
  portrait: { key: 'portrait', label: '4:5 Portrait', width: 1080, height: 1350 },
  square:   { key: 'square',   label: '1:1 Square',   width: 1080, height: 1080 },
  story:    { key: 'story',    label: '9:16 Story',   width: 1080, height: 1920 },
  facebook_cover: {
    key: 'facebook_cover',
    label: 'Facebook Cover',
    width: 1640,
    height: 624,
  },
  linkedin_banner: {
    key: 'linkedin_banner',
    label: 'LinkedIn Banner',
    width: 1128,
    height: 191,
  },
};

export const FORMAT_LIST: Format[] = Object.values(FORMATS);
