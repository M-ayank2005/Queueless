import { Platform } from 'react-native';
import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // Screen side padding 16 (replaces 20)
  xl: 20,
  xxl: 24, // Section gap 24
  xxxl: 28, // Inset for search row and chip row: 28px
  huge: 32,
  giant: 40,
};

export const radii = {
  xs: 4,
  alert: 8,
  sm: 8,
  button: 12,
  input: 12,
  chip: 14,
  iconButton: 14,
  md: 14,
  card: 16,
  borderedCard: 16,
  tile: 16,
  searchBar: 16,
  search: 16,
  lg: 16,
  xl: 24,
  bottomSheet: 30,
  hero: 30,
  heroCard: 30,
  tabBar: 36,
  loginSheet: 40,
  full: 9999,
};

export const fontFamilies = {
  interLight: 'Inter_300Light',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  poppinsRegular: 'Poppins_400Regular',
  poppinsMedium: 'Poppins_500Medium',
};

export const typography = {
  families: fontFamilies,
  // Brand & Launch
  launchWordmark: {
    fontFamily: 'Inter_300Light',
    fontSize: 48,
    fontWeight: '300' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
  },
  onboardingBrand: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 40,
    fontWeight: '400' as const,
    color: colors.primary,
    textAlign: 'center' as const,
  },
  onboardingHeading: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 22,
    fontWeight: '500' as const,
    color: colors.text,
    textAlign: 'center' as const,
    lineHeight: 30,
  },
  onboardingSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.faint,
    textAlign: 'center' as const,
    lineHeight: 22,
  },

  // Headers & Titles
  loginHeroTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  loginHeroTagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  screenTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 20,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  cardTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },

  // Content
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  secondary: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  meta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.muted,
  },
  micro: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    fontWeight: '400' as const,
    color: colors.muted,
  },

  // Forms & Interactive
  fieldLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  inputText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  placeholder: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.placeholder,
  },
  primaryButtonLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  pill: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  chip: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    fontWeight: '400' as const,
  },

  // Backwards compatibility aliases
  h1: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: 'Inter_500Medium',
    fontSize: 20,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  h3: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.muted,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.muted,
  },
  badge: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    fontWeight: '500' as const,
  },
};

export const shadows = {
  subtle: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: {
      elevation: 1,
    },
    web: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    default: {},
  }),
  alertCard: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    },
    default: {},
  }),
  alert: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    },
    default: {},
  }),
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    },
    default: {},
  }),
  primaryButton: Platform.select({
    ios: {
      shadowColor: '#284D83',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
    android: {
      elevation: 5,
    },
    web: {
      boxShadow: '0 8px 16px rgba(40, 77, 131, 0.25)',
    },
    default: {},
  }),
  activeChip: Platform.select({
    ios: {
      shadowColor: '#284D83',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.30,
      shadowRadius: 14,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 8px 14px rgba(40, 77, 131, 0.30)',
    },
    default: {},
  }),
  heroCard: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
    },
    default: {},
  }),
  tabBar: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
    },
    web: {
      boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.08)',
    },
    default: {},
  }),
  glow: Platform.select({
    ios: {
      shadowColor: '#284D83',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 4px 12px rgba(40, 77, 131, 0.25)',
    },
    default: {},
  }),
};
