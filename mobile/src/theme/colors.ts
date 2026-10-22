export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  pageTint: string;
  pageTintEnd: string;
  storeDetailBg: string;

  card: string;
  cardSoft: string;
  cardElevated: string;
  cardGlow: string;
  cardBorder: string;
  noteBg: string;
  listCardBg: string;

  border: string;
  borderLight: string;
  borderSubtle: string;
  inputBorder: string;
  outlineBorder: string;

  text: string;
  textPrimary: string;
  textSecondary: string;
  muted: string;
  mutedDark: string;
  placeholder: string;
  faint: string;

  primary: string;
  primaryHover: string;
  primaryStrong: string;
  primaryDark: string;
  primarySubtle: string;
  primaryBorder: string;
  primaryGradientStart: string;
  primaryGradientEnd: string;
  brandBlue: string;
  brandBlueLight: string;
  brandTint: string;

  success: string;
  successLight: string;
  successSubtle: string;
  successBorder: string;
  successText: string;
  successProgress: string;

  warning: string;
  warningLight: string;
  warningSubtle: string;
  warningBorder: string;

  danger: string;
  dangerLight: string;
  dangerSubtle: string;
  dangerBorder: string;
  dangerHelper: string;

  info: string;
  infoSubtle: string;

  statusOpenBg: string;
  statusOpenText: string;
  statusCloseSoonBg: string;
  statusCloseSoonText: string;
  statusClosedBg: string;
  statusClosedText: string;
  statusWaitingBg: string;
  statusWaitingText: string;

  alertInfoBg: string;
  alertInfoBorder: string;
  alertInfoIcon: string;
  alertSuccessBg: string;
  alertSuccessBorder: string;
  alertSuccessIcon: string;
  alertDangerBg: string;
  alertDangerBorder: string;
  alertDangerIcon: string;
  alertOfferBg: string;
  alertOfferBorder: string;
  alertOfferIcon: string;

  link: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  // Screen and surface backgrounds
  bg: '#FFFFFF',
  bgSecondary: '#F7F7F7',
  bgTertiary: '#EFEFEF',
  pageTint: '#F5F8FC',
  pageTintEnd: '#EAF1FB',
  storeDetailBg: '#FAFAFA',

  // Cards and tiles
  card: '#FFFFFF',
  cardSoft: '#F7F7F7',
  cardElevated: '#FFFFFF',
  cardGlow: 'rgba(40, 77, 131, 0.25)',
  cardBorder: '#A1A1A1',
  noteBg: '#F4F4F4',
  listCardBg: '#EFEFEF',

  // Borders & Dividers
  border: '#EAE8E8',
  borderLight: '#DCDCDC',
  borderSubtle: '#F0F0F0',
  inputBorder: '#C6C6C6',
  outlineBorder: '#D5D5E0',

  // Typography
  text: '#1A1A1A',
  textPrimary: '#000000',
  textSecondary: '#525252',
  muted: '#858585',
  mutedDark: '#666666',
  placeholder: '#9E9E9E',
  faint: '#9CA3AF',

  // Primary Navy Brand
  primary: '#284D83',
  primaryHover: '#335F9E',
  primaryStrong: '#1E3A63',
  primaryDark: '#172E50',
  primarySubtle: '#E6EDF7',
  primaryBorder: '#3E6BB2',
  primaryGradientStart: '#284D83',
  primaryGradientEnd: '#3E6BB2',
  brandBlue: '#3E6BB2',
  brandBlueLight: '#4988C4',
  brandTint: '#E6EDF7',

  // Status & Semantics
  success: '#347F4F',
  successLight: '#53A972',
  successSubtle: '#EFFEF5',
  successBorder: '#C6E5D2',
  successText: '#047857',
  successProgress: '#12B76A',

  warning: '#F9773B',
  warningLight: '#F3C3AD',
  warningSubtle: '#FFF5F0',
  warningBorder: '#F3C3AD',

  danger: '#FC0015',
  dangerLight: '#F4A8AE',
  dangerSubtle: '#FFF0F0',
  dangerBorder: '#F5C2C2',
  dangerHelper: '#D93636',

  info: '#284D83',
  infoSubtle: '#EDF9FF',

  // Status Pills
  statusOpenBg: '#C6E5D2',
  statusOpenText: '#047857',
  statusCloseSoonBg: '#F3C3AD',
  statusCloseSoonText: '#F9773B',
  statusClosedBg: '#F4A8AE',
  statusClosedText: '#FC0015',
  statusWaitingBg: '#E6EDF7',
  statusWaitingText: '#284D83',

  // Alert & Notification Card Palettes
  alertInfoBg: '#EDF9FF',
  alertInfoBorder: '#DCDCDC',
  alertInfoIcon: '#284D83',
  alertSuccessBg: '#EFFEF5',
  alertSuccessBorder: '#DCDCDC',
  alertSuccessIcon: '#347F4F',
  alertDangerBg: '#FFF0F0',
  alertDangerBorder: '#F5C2C2',
  alertDangerIcon: '#D64545',
  alertOfferBg: '#EFFEF5',
  alertOfferBorder: '#C8E6C9',
  alertOfferIcon: '#2E7D32',

  link: '#448AFF',
  overlay: 'rgba(0, 0, 0, 0.45)',
};

export const darkColors: ThemeColors = {
  // Pure Pitch Black OLED Dark Mode (not gray)
  bg: '#000000',
  bgSecondary: '#0A0A0A',
  bgTertiary: '#141414',
  pageTint: '#000000',
  pageTintEnd: '#0A0A0A',
  storeDetailBg: '#000000',

  card: '#121212',
  cardSoft: '#181818',
  cardElevated: '#1E1E1E',
  cardGlow: 'rgba(56, 189, 248, 0.20)',
  cardBorder: '#2A2A2A',
  noteBg: '#141414',
  listCardBg: '#121212',

  border: '#262626',
  borderLight: '#333333',
  borderSubtle: '#1C1C1C',
  inputBorder: '#3A3A3A',
  outlineBorder: '#333333',

  text: '#F5F5F5',
  textPrimary: '#FFFFFF',
  textSecondary: '#D4D4D4',
  muted: '#9E9E9E',
  mutedDark: '#737373',
  placeholder: '#666666',
  faint: '#404040',

  primary: '#2F6FED',
  primaryHover: '#3B82F6',
  primaryStrong: '#1D4ED8',
  primaryDark: '#1E40AF',
  primarySubtle: 'rgba(47, 111, 237, 0.20)',
  primaryBorder: '#2F6FED',
  primaryGradientStart: '#1D4ED8',
  primaryGradientEnd: '#2F6FED',
  brandBlue: '#2F6FED',
  brandBlueLight: '#60A5FA',
  brandTint: '#121212',

  success: '#16A34A',
  successLight: '#22C55E',
  successSubtle: 'rgba(34, 197, 94, 0.18)',
  successBorder: '#15803D',
  successText: '#4ADE80',
  successProgress: '#22C55E',

  warning: '#EA580C',
  warningLight: '#F97316',
  warningSubtle: 'rgba(234, 88, 12, 0.18)',
  warningBorder: '#9A3412',

  danger: '#DC2626',
  dangerLight: '#EF4444',
  dangerSubtle: 'rgba(220, 38, 38, 0.18)',
  dangerBorder: '#991B1B',
  dangerHelper: '#F87171',

  info: '#0284C7',
  infoSubtle: 'rgba(2, 132, 199, 0.18)',

  statusOpenBg: '#052E16',
  statusOpenText: '#4ADE80',
  statusCloseSoonBg: '#431407',
  statusCloseSoonText: '#FB923C',
  statusClosedBg: '#450A0A',
  statusClosedText: '#F87171',
  statusWaitingBg: '#172554',
  statusWaitingText: '#93C5FD',

  alertInfoBg: '#082F49',
  alertInfoBorder: '#0369A1',
  alertInfoIcon: '#38BDF8',
  alertSuccessBg: '#052E16',
  alertSuccessBorder: '#15803D',
  alertSuccessIcon: '#4ADE80',
  alertDangerBg: '#450A0A',
  alertDangerBorder: '#B91C1C',
  alertDangerIcon: '#F87171',
  alertOfferBg: '#052E16',
  alertOfferBorder: '#15803D',
  alertOfferIcon: '#4ADE80',

  link: '#60A5FA',
  overlay: 'rgba(0, 0, 0, 0.85)',
};

export const colors = lightColors;
