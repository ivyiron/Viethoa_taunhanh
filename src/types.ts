export interface ManualKerningPair {
  companion: string;
  isCompanionLeft: boolean;
  value: number;
}

export interface DiacriticTemplate {
  id: string;          // 'acute' | 'grave' | 'hook' | 'tilde' | 'dot_below' | 'circumflex' | 'breve' | 'horn' | 'bar'
  name: string;        // e.g., 'Dấu sắc (Acute)'
  svgPath: string;     // Raw SVG path data
  scaleX: number;      // scale factor
  scaleY: number;
  offsetX: number;     // manual shift
  offsetY: number;
  autoCenterX?: boolean; // toggle auto horizontal center aligning
  
  // Optional uppercase-specific variant settings
  hasCapVariant?: boolean;
  capSvgPath?: string;
  capScaleX?: number;
  capScaleY?: number;
  capOffsetX?: number;
  capOffsetY?: number;
  capAutoCenterX?: boolean;
}

export interface AutoPositionRules {
  useGroupHeightAlignment?: boolean; // Align diacritic Y heights by vowel group (x-Height / Cap-Height / Baseline) for 100% consistent accent lines (default: true)
  lowercaseAccentGap: number;  // Distance above lowercase letter top (default: 45)
  uppercaseAccentGap: number;  // Distance above uppercase letter top (default: 55)
  lowercaseAccentScale: number; // Scale factor for accents on lowercase (default: 0.8)
  uppercaseAccentScale: number; // Scale factor for accents on uppercase (default: 1.0)
  dotBelowGap: number;          // Distance below baseline/bottom (default: 60)
  dotBelowScale: number;        // Scale of dot below (default: 0.8)
  hornScale: number;            // Scale of horn for ư/ơ (default: 0.85)
  hornOffsetX: number;          // Horizontal tweak for horn (default: 0)
  hornOffsetY: number;          // Vertical tweak for horn (default: 0)
  barScale: number;             // Scale of bar for đ/Đ (default: 1.0)
  barOffsetX: number;           // Horizontal tweak for bar (default: 0)
  barOffsetY: number;           // Vertical tweak for bar (default: 0)
  doubleAccentStyle: 'stacked' | 'side' | 'custom'; // 'stacked' (vertical stack), 'side' (angled offset), or 'custom' (custom relative X,Y)
  doubleAccentGap: number;      // Distance between circumflex/breve and accent above (default: 20)
  doubleAccentCustomX?: number; // Custom relative X offset for double accents (default: 0)
  doubleAccentCustomY?: number; // Custom relative Y offset for double accents (default: 0)
}

export interface GlyphOverrideState {
  char: string;
  offsetX: number;      // Extra offset on top of auto-position
  offsetY: number;
  scaleX: number;
  scaleY: number;
  advanceWidthTweak: number; // Add/subtract advance width (default: 0)
  isCompleted: boolean; // Marked as reviewed/approved
  comp1OffsetX?: number; // Extra horizontal offset for first component of composite accent
  comp1OffsetY?: number; // Extra vertical offset for first component of composite accent
  comp2OffsetX?: number; // Extra horizontal offset for second component of composite accent
  comp2OffsetY?: number; // Extra vertical offset for second component of composite accent
}

export interface FontMetadata {
  name: string;
  family: string;
  subfamily: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
  totalGlyphs: number;
}

export interface VietnameseProjectFile {
  ftnVersion: string;
  appName: string;
  savedAt: string;
  filename: string;
  fontMetadata: FontMetadata;
  rawFontBufferBase64: string;
  customFamilyName?: string;
  customSubfamilyName?: string;
  preserveExistingGlyphs?: boolean;
  templates: Record<string, DiacriticTemplate>;
  rules: AutoPositionRules;
  overrides: Record<string, GlyphOverrideState>;
}
