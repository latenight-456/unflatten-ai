
export enum AppState {
  LANDING = 'LANDING',
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  EDITING = 'EDITING',
  ERROR = 'ERROR'
}

export enum LayerType {
  BACKGROUND = 'background',
  OBJECT = 'object',
  TEXT = 'text',
  GRAPHIC_ELEMENT = 'graphic_element',
  COMPOSITION = 'composition',
  GENERATED = 'generated'
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface PaletteColor {
  hex: string;
  name: string;
  role: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  luminance: number;
  isDark: boolean;
  matchedLayerIds?: string[];
}

export interface DeducedPalette {
  themeName: string;
  themeDescription: string;
  harmony: string;
  colors: PaletteColor[];
}

export type CanvasViewMode = 'layers' | 'split' | 'original' | 'compare';

export interface LayerJsonBreakdown {
  id?: string;
  layer_index?: number;
  label: string;
  category: string;
  semantic_role?: string;
  depth?: 'foreground' | 'midground' | 'background';
  z_index?: number;
  bounding_box: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    width_normalized?: number;
    height_normalized?: number;
  };
  geometry_pixels?: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspect_ratio?: string;
  };
  visual_prompt: string;
  color_palette?: string[];
  ocr_text?: string | null;
  confidence: number;
  attributes?: string[];
}

export interface DetectedElement {
  label: string;
  category: LayerType;
  box_2d: number[]; // [ymin, xmin, ymax, xmax]
  visual_prompt: string;
  color_palette?: string[];
  ocr_text?: string;
  confidence?: number;
  semantic_role?: string;
  depth?: 'foreground' | 'midground' | 'background';
  z_index?: number;
  attributes?: string[];
  json_breakdown?: LayerJsonBreakdown;
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  isVisible: boolean;
  box: BoundingBox; // Normalized 0-1000 coordinates
  imageSrc: string; // Base64 or Blob URL of the extracted cutout
  originalX: number; // Pixel coordinate on canvas
  originalY: number; // Pixel coordinate on canvas
  width: number; // Pixel width
  height: number; // Pixel height
  visual_prompt?: string;
  color_palette?: string[];
  ocr_text?: string;
  confidence?: number;
  semantic_role?: string;
  depth?: 'foreground' | 'midground' | 'background';
  z_index?: number;
  attributes?: string[];
  json_breakdown?: LayerJsonBreakdown;
  isGenerating?: boolean;
  isAnalyzing?: boolean;
  isGenerated?: boolean;
  parentId?: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  src: string;
  file?: File; // Optional as it can't be stored in IndexedDB easily, we use src
  palette?: DeducedPalette;
}

export interface Project {
  id: string;
  name: string;
  timestamp: number;
  imageMetadata: ImageMetadata;
  layers: Layer[];
  palette?: DeducedPalette;
}

