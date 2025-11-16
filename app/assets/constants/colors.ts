/**
 * Enhanced ZenLock Timer Color System
 * Premium Apple-style design with glassmorphism effects - Dark Theme Only
 */

export interface ColorTheme {
  // Core backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Accent colors
  accent: string;
  accentLight: string;
  accentDark: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  
  // Interactive elements
  buttonPrimary: string;
  buttonPrimaryHover: string;
  buttonSecondary: string;
  buttonSecondaryHover: string;
  
  // Borders and dividers
  border: string;
  borderLight: string;
  borderDark: string;
  
  // Glassmorphism effects
  glassBackground: string;
  glassBorder: string;
  glassShadow: string;
  
  // Progress indicators
  progress: string;
  progressBackground: string;
  
  // Overlay and modal
  overlay: string;
  overlayLight: string;
  
  // Shadows
  shadow: string;
  shadowLight: string;
  shadowMedium: string;
  shadowHeavy: string;
}

const darkTheme: ColorTheme = {
  // Core backgrounds - solid dark colors
  background: '#000000',
  backgroundSecondary: '#161B22',
  backgroundTertiary: '#21262D',
  surface: 'rgba(33, 38, 45, 0.85)',
  surfaceSecondary: 'rgba(45, 51, 59, 0.9)',
  surfaceTertiary: 'rgba(61, 66, 74, 0.85)',
  
  // Text colors - premium dark mode with enhanced contrast
  text: '#FFFFFF',
  textSecondary: '#E6EDF3',
  textTertiary: '#B8C5D0',
  textInverse: '#0D1117',
  
  // Primary colors - enhanced iOS blue with better dark mode contrast
  primary: '#4A8FFF',
  primaryLight: '#6BA4FF',
  primaryDark: '#3A7BDB',
  
  // Accent colors - premium orange with enhanced warmth for dark mode
  accent: '#FFB347',
  accentLight: '#FFC563',
  accentDark: '#E8A030',
  
  // Status colors - enhanced contrast and vibrancy
  success: '#4ECDC4',
  warning: '#FFD93D',
  error: '#FF6B6B',
  
  // Interactive elements - premium feel with subtle animations
  buttonPrimary: '#4A8FFF',
  buttonPrimaryHover: '#5B9FFF',
  buttonSecondary: 'rgba(45, 51, 59, 0.8)',
  buttonSecondaryHover: 'rgba(61, 66, 74, 0.9)',
  
  // Borders and dividers - refined dark mode borders
  border: 'rgba(139, 148, 158, 0.3)',
  borderLight: 'rgba(139, 148, 158, 0.15)',
  borderDark: 'rgba(139, 148, 158, 0.5)',
  
  // Glassmorphism effects - premium dark glass with subtle glow
  glassBackground: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassShadow: 'rgba(0, 0, 0, 0.4)',
  
  // Progress indicators - enhanced warmth and visibility
  progress: '#FFB347',
  progressBackground: 'rgba(255, 179, 71, 0.2)',
  
  // Overlay and modal - refined transparency
  overlay: 'rgba(13, 17, 23, 0.8)',
  overlayLight: 'rgba(13, 17, 23, 0.6)',
  
  // Shadows - premium depth with subtle colored undertones
  shadow: 'rgba(0, 0, 0, 0.25)',
  shadowLight: 'rgba(0, 0, 0, 0.15)',
  shadowMedium: 'rgba(0, 0, 0, 0.35)',
  shadowHeavy: 'rgba(0, 0, 0, 0.5)',
};

const Colors = {
  dark: darkTheme,
};

export default Colors;
