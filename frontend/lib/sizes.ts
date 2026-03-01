/**
 * Centralized size tokens. Use these in all components so layout and type
 * can be changed in one place. Radius references the CSS variable from globals.css.
 */
export const fontSizes = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "30px",
} as const;

/** Border radius; uses CSS variable from globals.css */
export const radius = "var(--radius)";

export const borderWidth = {
  thin: "1px",
} as const;

/** Spacing scale (px) for gap, padding, margin */
export const spacing = {
  0: "0",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
} as const;

/** Max width for main content container */
export const containerMaxWidth = "896px";

/** Control heights (buttons, inputs) */
export const controlHeight = {
  xs: "24px",
  sm: "32px",
  default: "36px",
  lg: "40px",
} as const;

export type FontSize = keyof typeof fontSizes;
export type Spacing = keyof typeof spacing;
