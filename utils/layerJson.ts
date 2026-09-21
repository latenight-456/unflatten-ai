import { Layer, DetectedElement, LayerType, LayerJsonBreakdown, ImageMetadata, DeducedPalette } from '../types';

/**
 * Builds a comprehensive, structured JSON breakdown for an individual layer.
 */
export function createLayerJsonBreakdown(
  element: {
    label: string;
    category: LayerType | string;
    box_2d: number[];
    visual_prompt: string;
    color_palette?: string[];
    ocr_text?: string | null;
    confidence?: number;
    semantic_role?: string;
    depth?: 'foreground' | 'midground' | 'background';
    z_index?: number;
    attributes?: string[];
  },
  pixelGeometry: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth?: number;
    imageHeight?: number;
  },
  layerIndex: number,
  id: string
): LayerJsonBreakdown {
  const [ymin, xmin, ymax, xmax] = element.box_2d;
  const widthNorm = Math.max(0, xmax - xmin);
  const heightNorm = Math.max(0, ymax - ymin);
  const ratio = pixelGeometry.width > 0 && pixelGeometry.height > 0
    ? (pixelGeometry.width / pixelGeometry.height).toFixed(2)
    : "1.00";

  const category = (element.category as LayerType) || LayerType.OBJECT;

  const defaultRole = 
    category === LayerType.BACKGROUND ? "ambient backdrop" :
    category === LayerType.COMPOSITION ? "master composition" :
    category === LayerType.TEXT ? "typography overlay" :
    category === LayerType.GRAPHIC_ELEMENT ? "decorative graphic" :
    "focal subject";

  const defaultDepth: 'foreground' | 'midground' | 'background' = 
    category === LayerType.BACKGROUND ? "background" :
    category === LayerType.COMPOSITION ? "background" :
    "foreground";

  return {
    id,
    layer_index: layerIndex + 1,
    label: element.label,
    category: String(category),
    semantic_role: element.semantic_role || defaultRole,
    depth: element.depth || defaultDepth,
    z_index: element.z_index !== undefined ? element.z_index : (category === LayerType.BACKGROUND ? 0 : layerIndex + 1),
    bounding_box: {
      ymin,
      xmin,
      ymax,
      xmax,
      width_normalized: widthNorm,
      height_normalized: heightNorm
    },
    geometry_pixels: {
      x: Math.round(pixelGeometry.x),
      y: Math.round(pixelGeometry.y),
      width: Math.round(pixelGeometry.width),
      height: Math.round(pixelGeometry.height),
      aspect_ratio: `${ratio}:1`
    },
    visual_prompt: element.visual_prompt,
    color_palette: element.color_palette || [],
    ocr_text: element.ocr_text || null,
    confidence: typeof element.confidence === 'number' ? Number(element.confidence.toFixed(2)) : 0.95,
    attributes: element.attributes && element.attributes.length > 0 ? element.attributes : [
      category,
      defaultDepth,
      widthNorm > 500 ? "large-scale" : "compact"
    ]
  };
}

/**
 * Creates the full document-level JSON breakdown of all layers, canvas specs, and color palette.
 */
export function createFullAnalysisJson(
  imageMetadata: ImageMetadata | null,
  palette: DeducedPalette | null,
  layers: Layer[]
) {
  const visibleLayers = layers.filter(l => l.type !== LayerType.COMPOSITION);
  const compositionLayer = layers.find(l => l.type === LayerType.COMPOSITION);

  return {
    document_title: "Unflatten AI — Layer Breakdown & Semantic Analysis",
    version: "2.1",
    timestamp: new Date().toISOString(),
    canvas: {
      width_px: imageMetadata?.width || 1024,
      height_px: imageMetadata?.height || 1024,
      aspect_ratio: imageMetadata && imageMetadata.height > 0
        ? `${(imageMetadata.width / imageMetadata.height).toFixed(2)}:1`
        : "1.00:1",
      total_layers_count: visibleLayers.length,
      has_typography: visibleLayers.some(l => l.type === LayerType.TEXT || Boolean(l.ocr_text))
    },
    palette_harmony: palette ? {
      theme: palette.themeName,
      description: palette.themeDescription,
      harmony_type: palette.harmony,
      swatches: palette.colors.map(c => ({
        hex: c.hex,
        name: c.name,
        role: c.role,
        is_dark: c.isDark
      }))
    } : null,
    master_composition: compositionLayer ? {
      label: compositionLayer.name,
      visual_prompt: compositionLayer.visual_prompt || "",
      style: compositionLayer.attributes || []
    } : null,
    layers_breakdown: visibleLayers.map((layer, idx) => {
      if (layer.json_breakdown) {
        return layer.json_breakdown;
      }
      return createLayerJsonBreakdown(
        {
          label: layer.name,
          category: layer.type,
          box_2d: [layer.box.ymin, layer.box.xmin, layer.box.ymax, layer.box.xmax],
          visual_prompt: layer.visual_prompt || `Asset representing ${layer.name}`,
          color_palette: layer.color_palette,
          ocr_text: layer.ocr_text,
          confidence: layer.confidence,
          semantic_role: layer.semantic_role,
          depth: layer.depth,
          z_index: layer.z_index,
          attributes: layer.attributes
        },
        {
          x: layer.originalX,
          y: layer.originalY,
          width: layer.width,
          height: layer.height
        },
        idx,
        layer.id
      );
    })
  };
}
