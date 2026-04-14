export const theme = {
  colors: {
    primary: "#0D3D3D", // Deep Teal
    accent: "#1A7A7A", // Teal
    text: "#444444", // Dark Gray
    bg: "#EFEFEF", // Light Gray
    white: "#FFFFFF",
    error: "#F87272",
    success: "#36D399",
    warning: "#FBBD23",
    info: "#3ABFF8",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 32,
    xl: 64,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
  fonts: {
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 22,
      xl: 28,
    },
    weight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: 'bold',
    }
  }
} as const;

export type Theme = typeof theme;
