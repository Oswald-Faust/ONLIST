export const COLORS = {
  // Fonds — noir neutre (sans teinte bleue)
  bg: '#0A0A0F',
  bgCard: '#111110',
  bgCard2: '#1A1A18',
  bgInput: '#1E1E1C',

  // Accents Bronze Champagne
  primary: '#C9A961',
  primaryLight: '#D4AF77',
  secondary: '#A89060',
  gradient: ['#C0A981', '#D4AF77'],
  gradientCard: ['rgba(201,169,97,0.25)', 'rgba(201,169,97,0.05)'],

  // Or/premium (alias cohérent avec le bronze)
  gold: '#C9A961',
  goldLight: '#D4AF77',

  // Texte — tons chauds neutres
  white: '#FFFFFF',
  textPrimary: '#F0EBE0',
  textSecondary: '#9A8E7E',
  textMuted: '#5A5248',

  // Statuts
  success: '#10D9A0',
  warning: '#F59E0B',
  error: '#EF4444',
  pending: '#F59E0B',
  accepted: '#10D9A0',
  rejected: '#EF4444',

  // Bordures — bronze subtil
  border: 'rgba(201,169,97,0.12)',
  borderLight: 'rgba(201,169,97,0.25)',
};

// Police Poppins — chargée via useFonts dans App.js
export const FONTS = {
  thin: 'Poppins_100Thin',
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    xxxl: 36,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const SHADOW = {
  card: {
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
};
