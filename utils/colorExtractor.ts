import { DeducedPalette, PaletteColor, Layer } from '../types';

// Helper: Convert RGB to HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Helper: Convert HEX to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 128, g: 128, b: 128 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Helper: Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Relative Luminance for WCAG Contrast
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Perceptual color distance in RGB space
export function colorDistance(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
  const rmean = (c1.r + c2.r) / 2;
  const r = c1.r - c2.r;
  const g = c1.g - c2.g;
  const b = c1.b - c2.b;
  return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
}

// Color naming dictionary
const COLOR_NAMES: Array<{ name: string; hex: string }> = [
  { name: 'Apple Off-White', hex: '#F5F5F7' },
  { name: 'Pure Snow White', hex: '#FFFFFF' },
  { name: 'Apple Midnight Black', hex: '#1D1D1F' },
  { name: 'Deep Space Gray', hex: '#111827' },
  { name: 'Apple Azure Blue', hex: '#007AFF' },
  { name: 'Electric Cyan', hex: '#0EA5E9' },
  { name: 'Graphite Silver', hex: '#AAAAAA' },
  { name: 'Slate Neutral', hex: '#64748B' },
  { name: 'Charcoal Noir', hex: '#0F172A' },
  { name: 'Warm Cream', hex: '#FAF5EF' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Sunset Amber', hex: '#F59E0B' },
  { name: 'Emerald Forest', hex: '#10B981' },
  { name: 'Neon Lime', hex: '#84CC16' },
  { name: 'Vibrant Violet', hex: '#8B5CF6' },
  { name: 'Royal Indigo', hex: '#6366F1' },
  { name: 'Hot Magenta', hex: '#EC4899' },
  { name: 'Coral Rose', hex: '#F43F5E' },
  { name: 'Muted Taupe', hex: '#78716C' },
  { name: 'Cool Zinc', hex: '#71717A' }
];

export function getNearestColorName(r: number, g: number, b: number): string {
  let closestName = 'Custom Tone';
  let minDistance = Infinity;

  for (const item of COLOR_NAMES) {
    const itemRgb = hexToRgb(item.hex);
    const dist = colorDistance({ r, g, b }, itemRgb);
    if (dist < minDistance) {
      minDistance = dist;
      closestName = item.name;
    }
  }

  // If difference is large, create descriptive hue + brightness name
  if (minDistance > 90) {
    const hsl = rgbToHsl(r, g, b);
    let brightness = 'Medium';
    if (hsl.l > 85) brightness = 'Pale';
    else if (hsl.l > 65) brightness = 'Light';
    else if (hsl.l < 25) brightness = 'Deep Dark';
    else if (hsl.l < 45) brightness = 'Dark';

    let hueName = 'Neutral';
    if (hsl.s < 12) {
      hueName = hsl.l > 70 ? 'Silver White' : hsl.l < 30 ? 'Onyx Charcoal' : 'Gray';
    } else {
      if (hsl.h >= 345 || hsl.h < 15) hueName = 'Red / Crimson';
      else if (hsl.h < 45) hueName = 'Orange / Amber';
      else if (hsl.h < 70) hueName = 'Gold / Yellow';
      else if (hsl.h < 150) hueName = 'Green / Emerald';
      else if (hsl.h < 200) hueName = 'Cyan / Aqua';
      else if (hsl.h < 260) hueName = 'Blue / Azure';
      else if (hsl.h < 310) hueName = 'Purple / Violet';
      else hueName = 'Pink / Magenta';
    }
    return `${brightness} ${hueName}`;
  }

  return closestName;
}

// Client-side instant image palette extractor
export async function extractPaletteFromImage(
  img: HTMLImageElement,
  maxColors: number = 4
): Promise<DeducedPalette> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) {
    return createDefaultPalette();
  }

  const sampleSize = 120;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  const colorBuckets: Map<string, { r: number; g: number; b: number; count: number }> = new Map();

  // Quantize colors to reduce noise (16 levels per channel)
  const step = 4; // Sample every 4th pixel for speed
  for (let i = 0; i < imgData.length; i += 4 * step) {
    const a = imgData[i + 3];
    if (a < 128) continue; // Skip transparency

    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];

    // Quantize to step of 24
    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;

    const existing = colorBuckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      colorBuckets.set(key, { r, g, b, count: 1 });
    }
  }

  // Sort buckets by frequency
  const sortedClusters = Array.from(colorBuckets.values())
    .map(b => ({
      r: Math.round(b.r / b.count),
      g: Math.round(b.g / b.count),
      b: Math.round(b.b / b.count),
      count: b.count
    }))
    .sort((a, b) => b.count - a.count);

  if (sortedClusters.length === 0) {
    return createDefaultPalette();
  }

  // Pick distinct colors with minimum perceptual distance
  const picked: Array<{ r: number; g: number; b: number; count: number }> = [];
  const minThreshold = 45; // Minimum color distance

  for (const candidate of sortedClusters) {
    const isTooClose = picked.some(p => colorDistance(p, candidate) < minThreshold);
    if (!isTooClose) {
      picked.push(candidate);
      if (picked.length >= maxColors) break;
    }
  }

  // If we couldn't find enough distinct colors, lower threshold and pick
  if (picked.length < maxColors) {
    for (const candidate of sortedClusters) {
      if (!picked.includes(candidate)) {
        picked.push(candidate);
        if (picked.length >= maxColors) break;
      }
    }
  }

  // Assign roles (Background, Accent, Secondary, Neutral)
  const colors: PaletteColor[] = picked.map((c, index) => {
    const hex = rgbToHex(c.r, c.g, c.b);
    const hsl = rgbToHsl(c.r, c.g, c.b);
    const lum = getLuminance(c.r, c.g, c.b);
    const isDark = lum < 0.45;
    const name = getNearestColorName(c.r, c.g, c.b);

    let role = 'Secondary';
    if (index === 0) {
      role = 'Primary Canvas';
    } else if (hsl.s > 40 && lum > 0.2 && lum < 0.85) {
      role = 'Focal Accent';
    } else if (isDark) {
      role = 'Dark Contrast';
    } else if (lum > 0.8) {
      role = 'Highlight / Light';
    } else {
      role = `Tone ${index + 1}`;
    }

    return {
      hex,
      name,
      role,
      rgb: { r: c.r, g: c.g, b: c.b },
      hsl,
      luminance: Number(lum.toFixed(3)),
      isDark,
    };
  });

  // Deduce theme name based on colors
  const hasVibrantBlue = colors.some(c => c.hex.toLowerCase().includes('007') || (c.hsl.h > 190 && c.hsl.h < 240 && c.hsl.s > 50));
  const hasDarkAndLight = colors.some(c => c.luminance > 0.8) && colors.some(c => c.luminance < 0.2);
  
  let themeName = "Apple Modern Clean";
  let themeDescription = "A refined high-contrast visual palette with clean neutral foundations and deliberate accent hierarchy.";
  let harmony = "Modern Neo-Minimalist";

  if (hasVibrantBlue && hasDarkAndLight) {
    themeName = "Apple Modern Studio";
    themeDescription = "Signature Apple-inspired layout balance combining pure light tones, deep onyx charcoal, and vibrant electric azure.";
    harmony = "Split-Tone Minimalist";
  } else if (colors.every(c => c.hsl.s < 20)) {
    themeName = "Monochrome Slate";
    themeDescription = "Sophisticated grayscale tonal hierarchy balancing crisp highlights and matte charcoal surfaces.";
    harmony = "Achromatic Neutral";
  } else if (colors.some(c => c.hsl.h < 40 && c.hsl.s > 40)) {
    themeName = "Warm Editorial Glow";
    themeDescription = "Organic warm tones paired with inviting neutral highlights for premium editorial design.";
    harmony = "Warm Analogous";
  }

  return {
    themeName,
    themeDescription,
    harmony,
    colors
  };
}

export function createDefaultPalette(): DeducedPalette {
  return {
    themeName: "Apple Modern",
    themeDescription: "A minimalist, high-contrast palette featuring neutral canvases, onyx charcoals, and vivid focal accents.",
    harmony: "Modern Studio Minimalist",
    colors: [
      {
        hex: "#F5F5F7",
        name: "Apple Off-White",
        role: "Primary Canvas",
        rgb: { r: 245, g: 245, b: 247 },
        hsl: { h: 240, s: 6, l: 96 },
        luminance: 0.92,
        isDark: false
      },
      {
        hex: "#1D1D1F",
        name: "Apple Midnight Charcoal",
        role: "Dark Contrast",
        rgb: { r: 29, g: 29, b: 31 },
        hsl: { h: 240, s: 3, l: 12 },
        luminance: 0.03,
        isDark: true
      },
      {
        hex: "#AAAAAA",
        name: "Graphite Silver",
        role: "Neutral Surface",
        rgb: { r: 170, g: 170, b: 170 },
        hsl: { h: 0, s: 0, l: 67 },
        luminance: 0.40,
        isDark: false
      },
      {
        hex: "#007AFF",
        name: "Apple Azure Blue",
        role: "Focal Accent",
        rgb: { r: 0, g: 122, b: 255 },
        hsl: { h: 211, s: 100, l: 50 },
        luminance: 0.22,
        isDark: true
      }
    ]
  };
}

// Match deduced palette colors to specific decomposed layers
export function associatePaletteWithLayers(palette: DeducedPalette, layers: Layer[]): DeducedPalette {
  const updatedColors = palette.colors.map(color => {
    const matchedLayerIds: string[] = [];
    const colorRgb = color.rgb;

    for (const layer of layers) {
      if (layer.color_palette && layer.color_palette.length > 0) {
        for (const hex of layer.color_palette) {
          const lRgb = hexToRgb(hex);
          if (colorDistance(colorRgb, lRgb) < 70) {
            matchedLayerIds.push(layer.id);
            break;
          }
        }
      }
    }

    return {
      ...color,
      matchedLayerIds
    };
  });

  return {
    ...palette,
    colors: updatedColors
  };
}

// Export helpers
export function exportPaletteCSS(palette: DeducedPalette): string {
  const vars = palette.colors.map((c, i) => `  --color-${c.role.toLowerCase().replace(/[^a-z0-9]/g, '-') || `tone-${i+1}`}: ${c.hex}; /* ${c.name} */`).join('\n');
  return `/* Deduced Palette: ${palette.themeName} */\n:root {\n${vars}\n}`;
}

export function exportPaletteTailwind(palette: DeducedPalette): string {
  const obj: Record<string, string> = {};
  palette.colors.forEach((c, i) => {
    const key = c.role.toLowerCase().replace(/[^a-z0-9]/g, '_') || `tone_${i+1}`;
    obj[key] = c.hex;
  });
  return `// Tailwind theme colors\ncolors: ${JSON.stringify(obj, null, 2)}`;
}

export function exportPaletteJSON(palette: DeducedPalette): string {
  return JSON.stringify(palette, null, 2);
}
