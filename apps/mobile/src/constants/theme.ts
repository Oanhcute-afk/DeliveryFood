/**
 * Burger-inspired theme palette and layout constants for DeliFood.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const BURGER_COLORS = {
  background: '#FDF6EC', // Warm toasted sesame bun cream
  surface: '#FFFDF9', // Clean warm ivory card surface
  surfaceMuted: '#F7ECDE', // Soft toasted bun secondary fill
  surfaceAlt: '#F7ECDE', // Alias for secondary surface
  primary: '#D94E1F', // Flame-grilled burger orange-red
  primaryDark: '#B53B13', // Deep BBQ glaze
  primaryLight: '#FDE9DF', // Soft burger sauce tint
  cheese: '#F4A922', // Melted cheddar cheese gold
  cheeseDark: '#8F5B05', // Rich amber text on cheese badge
  cheeseLight: '#FFF3D1', // Soft melted cheddar tint
  warning: '#F4A922', // Alias for cheese gold
  warningLight: '#FFF3D1',
  lettuce: '#238649', // Fresh crispy lettuce green
  lettuceLight: '#E6F6EC', // Soft lettuce tint
  success: '#238649', // Alias for crispy lettuce green
  successLight: '#E6F6EC', // Alias for soft lettuce tint
  tomato: '#D93829', // Ripe tomato red
  tomatoLight: '#FDECE9', // Soft tomato tint
  danger: '#D93829', // Alias for ripe tomato red
  dangerLight: '#FDECE9', // Alias for soft tomato tint
  blue: '#2B6CB0',
  blueLight: '#EBF4FF',
  purple: '#6B46C1',
  purpleLight: '#F3EBFF',
  text: '#2C1A11', // Grilled patty dark brown
  textSoft: '#4E3528', // Medium roast brown
  muted: '#7D6354', // Warm crust muted text
  faint: '#A68E80', // Subtle warm placeholder text
  border: '#EAD9C7', // Warm bun border
  divider: '#F2E5D7', // Subtle warm divider
  white: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: BURGER_COLORS.text,
    background: BURGER_COLORS.background,
    backgroundElement: BURGER_COLORS.surfaceMuted,
    backgroundSelected: BURGER_COLORS.primaryLight,
    textSecondary: BURGER_COLORS.muted,
  },
  dark: {
    text: '#FFF8F0',
    background: '#1E130D',
    backgroundElement: '#2C1C14',
    backgroundSelected: '#3D271C',
    textSecondary: '#C4AE9F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
