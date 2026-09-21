import React, { useState, useEffect, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { LandingPage } from './components/LandingPage';
import { LayerList } from './components/LayerList';
import { CanvasEditor } from './components/CanvasEditor';
import { ColorPaletteSection } from './components/ColorPaletteSection';
import { WorkspaceSidePanel, WorkspaceTab } from './components/WorkspaceSidePanel';
import { AppState, ImageMetadata, Layer, DetectedElement, LayerType, Project, DeducedPalette } from './types';
import { 
  analyzeImageStructure, 
  generateElementImage, 
  regeneratePrompt, 
  mergeLayerPrompts, 
  reanalyzeLayer,
  deduceColorPalette 
} from './services/geminiService';
import { getProjects, saveProject, deleteProject } from './services/historyService';
import { 
  extractPaletteFromImage, 
  associatePaletteWithLayers, 
  createDefaultPalette, 
  hexToRgb 
} from './utils/colorExtractor';
import { createLayerJsonBreakdown, createFullAnalysisJson } from './utils/layerJson';
import { Button } from './components/Button';
import { 
  Palette, 
  Layers, 
  RefreshCw, 
  Download, 
  Home, 
  Sparkles, 
  X,
  Menu,
  ChevronDown
} from 'lucide-react';
// @ts-ignore
import JSZip from 'jszip';

const cropImage = async (
  sourceImage: HTMLImageElement, 
  box_1000: number[]
): Promise<{ url: string; x: number; y: number; w: number; h: number }> => {
  const [ymin, xmin, ymax, xmax] = box_1000;
  const canvas = document.createElement('canvas');
  const x = (xmin / 1000) * sourceImage.naturalWidth;
  const y = (ymin / 1000) * sourceImage.naturalHeight;
  const w = ((xmax - xmin) / 1000) * sourceImage.naturalWidth;
  const h = ((ymax - ymin) / 1000) * sourceImage.naturalHeight;

  if (w <= 0 || h <= 0) {
    canvas.width = 1;
    canvas.height = 1;
    return { url: canvas.toDataURL('image/png'), x, y, w: 0, h: 0 };
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("No context");
  ctx.drawImage(sourceImage, x, y, w, h, 0, 0, w, h);
  return { url: canvas.toDataURL('image/png'), x, y, w, h };
};

export default function App() {
  const [state, setState] = useState<AppState>(AppState.LANDING);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [palette, setPalette] = useState<DeducedPalette | null>(null);
  const [selectedColorHex, setSelectedColorHex] = useState<string | null>(null);
  const [showPalettePanel, setShowPalettePanel] = useState(true);
  const [isRededucingPalette, setIsRededucingPalette] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('composition');
  const [activeTab, setActiveTab] = useState<'layers' | 'generated'>('layers');
  const [isShuffling, setIsShuffling] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Apply theme color dynamically based on deduced palette or image
  useEffect(() => {
    if (palette && palette.colors.length > 0) {
      // Find focal accent or dominant color
      const accent = palette.colors.find(c => c.role.includes('Accent')) || palette.colors[palette.colors.length - 1];
      if (accent) {
        document.documentElement.style.setProperty('--brand-rgb', `${accent.rgb.r}, ${accent.rgb.g}, ${accent.rgb.b}`);
      }
    } else {
      document.documentElement.style.setProperty('--brand-rgb', '14, 165, 233');
    }
  }, [palette]);

  // Load history on mount
  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    try {
      const projects = await getProjects();
      setRecentProjects(projects);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleSaveProject = useCallback(async (overridingLayers?: Layer[], overridingPalette?: DeducedPalette) => {
    if (!imageMetadata || !currentProjectId) return;
    
    const activePalette = overridingPalette || palette || imageMetadata.palette;
    const project: Project = {
      id: currentProjectId,
      name: currentProjectId.startsWith('proj-') ? currentProjectId.split('-')[1] : `Project ${formatDate(Date.now())}`,
      timestamp: Date.now(),
      imageMetadata: {
        ...imageMetadata,
        palette: activePalette
      },
      layers: overridingLayers || layers,
      palette: activePalette,
    };
    
    try {
      await saveProject(project);
      loadRecentProjects();
    } catch (e) {
      console.error("Failed to save project", e);
    }
  }, [imageMetadata, currentProjectId, layers, palette]);

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  const downloadLayer = (layer: Layer) => {
    const link = document.createElement('a');
    link.href = layer.imageSrc;
    link.download = `${layer.name.replace(/\s+/g, '_')}_${layer.isGenerated ? 'generated' : 'layer'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdatePrompt = (layerId: string, newPrompt: string) => {
    setLayers(prev => {
      const next = prev.map(l => l.id === layerId ? { ...l, visual_prompt: newPrompt } : l);
      return next;
    });
  };

  const handleSelectLayer = (id: string | null, multi: boolean = false) => {
    if (id === null) {
      setSelectedLayerIds([]);
      return;
    }
    if (multi) {
      setSelectedLayerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedLayerIds([id]);
    }
  };

  const handleShufflePrompt = async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.visual_prompt) return;
    setIsShuffling(layerId);
    try {
      const newPrompt = await regeneratePrompt(layer.visual_prompt, layer.type);
      handleUpdatePrompt(layerId, newPrompt);
    } catch (err) {
      console.error(err);
    } finally {
      setIsShuffling(null);
    }
  };

  const handleReanalyzeLayer = async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, isAnalyzing: true } : l));
    
    try {
      const match = layer.imageSrc.match(/^data:([^;]+);base64,(.+)$/);
      let base64Data = "";
      let mimeType = "image/png";
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = layer.imageSrc;
      }
      
      const result = await reanalyzeLayer(base64Data, mimeType, layer.type, layer.name);
      
      setLayers(prev => {
        const next = prev.map(l => l.id === layerId ? { 
          ...l, 
          name: result.label, 
          visual_prompt: result.visual_prompt,
          color_palette: result.color_palette || l.color_palette,
          ocr_text: result.ocr_text || l.ocr_text,
          confidence: result.confidence ?? l.confidence,
          isAnalyzing: false 
        } : l);
        
        if (palette) {
          const updatedPalette = associatePaletteWithLayers(palette, next);
          setPalette(updatedPalette);
        }

        if (currentProjectId && imageMetadata) {
          saveProject({
            id: currentProjectId,
            name: currentProjectId.startsWith('proj-') ? currentProjectId.split('-')[1] : `Project`,
            timestamp: Date.now(),
            imageMetadata,
            layers: next,
            palette: palette || undefined
          }).then(() => loadRecentProjects());
        }
        
        return next;
      });
    } catch (err) {
      console.error("Failed to re-analyze layer:", err);
      setLayers(prev => prev.map(l => l.id === layerId ? { ...l, isAnalyzing: false } : l));
    }
  };

  const handleApplyColorToPrompt = (hex: string, colorName: string) => {
    if (selectedLayerIds.length === 0) return;
    const targetLayerId = selectedLayerIds[0];
    const layer = layers.find(l => l.id === targetLayerId);
    if (!layer) return;

    const currentPrompt = layer.visual_prompt || layer.name;
    const colorInstruction = `\nColor Tone: ${colorName} (${hex})`;
    
    if (!currentPrompt.includes(hex)) {
      handleUpdatePrompt(targetLayerId, `${currentPrompt.trim()} ${colorInstruction}`);
    }
  };

  const handleHighlightLayersWithColor = (layerIds: string[]) => {
    if (layerIds && layerIds.length > 0) {
      setSelectedLayerIds(layerIds);
      setActiveTab('layers');
    }
  };

  const handleRededucePalette = async () => {
    if (!imageMetadata) return;
    setIsRededucingPalette(true);
    try {
      const base64Data = imageMetadata.src.split(',')[1];
      const mimeType = imageMetadata.src.match(/data:([^;]+);/)?.[1] || 'image/png';
      
      const aiPalette = await deduceColorPalette(base64Data, mimeType);
      
      const fullColors = aiPalette.colors.map(c => {
        const rgb = hexToRgb(c.hex);
        return {
          hex: c.hex,
          name: c.name,
          role: c.role,
          rgb,
          hsl: { h: 0, s: 0, l: c.isDark ? 15 : 90 },
          luminance: c.isDark ? 0.15 : 0.85,
          isDark: c.isDark
        };
      });

      const structuredPalette: DeducedPalette = {
        themeName: aiPalette.themeName,
        themeDescription: aiPalette.themeDescription,
        harmony: aiPalette.harmony,
        colors: fullColors
      };

      const matchedPalette = associatePaletteWithLayers(structuredPalette, layers);
      setPalette(matchedPalette);
      handleSaveProject(layers, matchedPalette);
    } catch (e) {
      console.warn("Re-deduce failed, refreshing local palette", e);
    } finally {
      setIsRededucingPalette(false);
    }
  };

  const handleMergeAndGenerate = async () => {
    if (selectedLayerIds.length < 2) return;
    const selectedLayers = layers.filter(l => selectedLayerIds.includes(l.id));
    
    setIsMerging(true);
    try {
      const boxes = selectedLayers.map(l => l.box);
      const ymin = Math.min(...boxes.map(b => b.ymin));
      const xmin = Math.min(...boxes.map(b => b.xmin));
      const ymax = Math.max(...boxes.map(b => b.ymax));
      const xmax = Math.max(...boxes.map(b => b.xmax));

      const prompts = selectedLayers.map(l => l.visual_prompt || l.name);
      const compoundPrompt = await mergeLayerPrompts(prompts);
      const newImageSrc = await generateElementImage(compoundPrompt);

      const newLayerId = `merge-${Date.now()}`;
      const newLayer: Layer = {
        id: newLayerId,
        name: `Group: ${selectedLayers.map(l => l.name).join(', ').substring(0, 20)}...`,
        type: LayerType.GENERATED,
        isVisible: true,
        box: { ymin, xmin, ymax, xmax },
        imageSrc: newImageSrc,
        originalX: Math.min(...selectedLayers.map(l => l.originalX)),
        originalY: Math.min(...selectedLayers.map(l => l.originalY)),
        width: Math.max(...selectedLayers.map(l => l.originalX + l.width)) - Math.min(...selectedLayers.map(l => l.originalX)),
        height: Math.max(...selectedLayers.map(l => l.originalY + l.height)) - Math.min(...selectedLayers.map(l => l.originalY)),
        visual_prompt: compoundPrompt,
        isGenerated: true,
      };

      const updatedLayers = [...layers, newLayer];
      setLayers(updatedLayers);
      setActiveTab('generated');
      setSelectedLayerIds([newLayerId]);
      
      if (currentProjectId && imageMetadata) {
        saveProject({
          id: currentProjectId,
          name: currentProjectId,
          timestamp: Date.now(),
          imageMetadata,
          layers: updatedLayers,
          palette: palette || undefined
        }).then(() => loadRecentProjects());
      }

    } catch (err) {
      console.error("Merge error:", err);
      alert("Failed to merge and generate.");
    } finally {
      setIsMerging(false);
    }
  };

  const handleLayerMove = (id: string, x: number, y: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, originalX: x, originalY: y } : l));
  };

  const handleExportZip = async () => {
    const visibleLayers = layers.filter(l => l.isVisible && l.type !== LayerType.COMPOSITION);
    if (visibleLayers.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      visibleLayers.forEach((layer, index) => {
        const base64Data = layer.imageSrc.split(',')[1];
        const prefix = layer.isGenerated ? 'generated_' : '';
        const safeName = layer.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `layer_${index}`;
        zip.file(`${prefix}${safeName}_${index}.png`, base64Data, { base64: true });
      });

      // Also export color palette JSON inside the ZIP!
      if (palette) {
        zip.file('color_palette.json', JSON.stringify(palette, null, 2));
      }

      // Automatically include comprehensive layer breakdown JSON inside the ZIP!
      if (imageMetadata) {
        const fullAnalysisJson = createFullAnalysisJson(imageMetadata, palette, layers);
        zip.file('layers_breakdown_analysis.json', JSON.stringify(fullAnalysisJson, null, 2));
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'unflatten_layers.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsZipping(false);
    }
  };

  const handleGenerateLayer = async (layerId: string, prompt: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, isGenerating: true } : l));
    try {
      const sourceLayer = layers.find(l => l.id === layerId);
      if (!sourceLayer) throw new Error("Source layer not found");

      let aspect = "1:1";
      if (sourceLayer.width && sourceLayer.height) {
        const ratio = sourceLayer.width / sourceLayer.height;
        if (ratio > 1.4) aspect = "16:9";
        else if (ratio < 0.65) aspect = "9:16";
        else if (ratio > 1.15) aspect = "4:3";
        else if (ratio < 0.85) aspect = "3:4";
        else aspect = "1:1";
      }

      const newImageSrc = await generateElementImage(
        prompt,
        sourceLayer.imageSrc,
        sourceLayer.type,
        aspect
      );

      const newLayerId = `gen-${layerId.substring(0, 8)}-${Date.now()}`;
      const newLayer: Layer = {
        ...sourceLayer,
        id: newLayerId,
        name: `Generated ${sourceLayer.name}`,
        type: LayerType.GENERATED,
        imageSrc: newImageSrc,
        isVisible: true,
        isGenerating: false,
        isGenerated: true,
        parentId: layerId,
        visual_prompt: prompt 
      };
      
      setLayers(prev => {
        const updated = prev.map(l => l.id === layerId ? { ...l, isGenerating: false } : l);
        const nextLayers = [...updated, newLayer];
        if (currentProjectId && imageMetadata) {
          saveProject({
            id: currentProjectId,
            name: currentProjectId,
            timestamp: Date.now(),
            imageMetadata,
            layers: nextLayers,
            palette: palette || undefined
          }).then(() => loadRecentProjects());
        }
        return nextLayers;
      });
      setActiveTab('generated');
      setSelectedLayerIds([newLayerId]);
    } catch (err) {
      console.error(err);
      setLayers(prev => prev.map(l => l.id === layerId ? { ...l, isGenerating: false } : l));
    }
  };

  const handleReanalyze = async () => {
    if (!imageMetadata) return;
    setState(AppState.ANALYZING);
    setErrorMsg(null);
    setLayers([]);
    setSelectedLayerIds([]);
    setActiveTab('layers');

    const src = imageMetadata.src;
    const img = new Image();
    img.onload = async () => {
      const base64Data = src.split(',')[1];
      try {
        const [detectedElements, localPalette] = await Promise.all([
          analyzeImageStructure(base64Data, 'image/png'),
          extractPaletteFromImage(img, 4)
        ]);

        const processedLayers: Layer[] = [];
        let hasComposition = false;
        for (let i = 0; i < detectedElements.length; i++) {
          const element = detectedElements[i];
          const cropped = await cropImage(img, element.box_2d);
          if (cropped.w <= 0 || cropped.h <= 0) continue;
          if (element.category === LayerType.COMPOSITION) hasComposition = true;
          const layerId = `layer-${i}-${Date.now()}`;
          const jsonBreakdown = createLayerJsonBreakdown(
            element,
            { x: cropped.x, y: cropped.y, width: cropped.w, height: cropped.h, imageWidth: img.naturalWidth, imageHeight: img.naturalHeight },
            i,
            layerId
          );

          processedLayers.push({
            id: layerId,
            name: element.label,
            type: element.category,
            isVisible: element.category !== LayerType.COMPOSITION,
            box: { ymin: element.box_2d[0], xmin: element.box_2d[1], ymax: element.box_2d[2], xmax: element.box_2d[3] },
            imageSrc: cropped.url,
            originalX: cropped.x,
            originalY: cropped.y,
            width: cropped.w,
            height: cropped.h,
            visual_prompt: element.visual_prompt || `A high quality image of ${element.label}`,
            color_palette: element.color_palette,
            ocr_text: element.ocr_text,
            confidence: element.confidence,
            semantic_role: element.semantic_role || jsonBreakdown.semantic_role,
            depth: element.depth || jsonBreakdown.depth,
            z_index: element.z_index !== undefined ? element.z_index : jsonBreakdown.z_index,
            attributes: element.attributes || jsonBreakdown.attributes,
            json_breakdown: jsonBreakdown
          });
        }
        if (!hasComposition) {
          const elementsSummary = detectedElements
            .filter(e => e.category !== LayerType.COMPOSITION)
            .map(e => e.visual_prompt || e.label)
            .filter(Boolean)
            .slice(0, 5)
            .join(', ');

          const compLayerId = `layer-comp-${Date.now()}`;
          const compPrompt = elementsSummary
            ? `Master full-composition remix prompt: Complete visual artwork featuring ${elementsSummary}, with harmonious color palette, refined lighting, and balanced spatial composition.`
            : "Master full-composition remix prompt: Complete high-resolution artwork with balanced focal subjects, depth of field, studio lighting, and rich color harmony.";

          const compJsonBreakdown = createLayerJsonBreakdown(
            {
              label: "Full Composition",
              category: LayerType.COMPOSITION,
              box_2d: [0, 0, 1000, 1000],
              visual_prompt: compPrompt,
              semantic_role: "master composition blueprint",
              depth: "background",
              z_index: 0,
              attributes: ["composition", "master-prompt", "holistic-scene"]
            },
            { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight, imageWidth: img.naturalWidth, imageHeight: img.naturalHeight },
            -1,
            compLayerId
          );

          processedLayers.unshift({
            id: compLayerId,
            name: "Full Composition",
            type: LayerType.COMPOSITION,
            isVisible: false,
            box: { ymin: 0, xmin: 0, ymax: 1000, xmax: 1000 },
            imageSrc: src,
            originalX: 0,
            originalY: 0,
            width: img.naturalWidth,
            height: img.naturalHeight,
            visual_prompt: compPrompt,
            semantic_role: "master composition blueprint",
            depth: "background",
            z_index: 0,
            attributes: ["composition", "master-prompt", "holistic-scene"],
            json_breakdown: compJsonBreakdown
          });
        }

        const matchedPalette = associatePaletteWithLayers(localPalette, processedLayers);
        setPalette(matchedPalette);
        setLayers(processedLayers);
        
        const compLayer = processedLayers.find(l => l.type === LayerType.COMPOSITION);
        if (compLayer) {
          setSelectedLayerIds([compLayer.id]);
        }

        setState(AppState.EDITING);
        
        if (currentProjectId) {
          await saveProject({
            id: currentProjectId,
            name: currentProjectId.split('-')[1] || "Unnamed Project",
            timestamp: Date.now(),
            imageMetadata: { ...imageMetadata, palette: matchedPalette },
            layers: processedLayers,
            palette: matchedPalette
          });
          loadRecentProjects();
        }

      } catch (err: any) {
        setErrorMsg(err.message || "Failed to analyze image.");
        setState(AppState.ERROR);
      }
    };
    img.src = src;
  };

  const handleFileSelect = async (file: File) => {
    setState(AppState.ANALYZING);
    setErrorMsg(null);
    setLayers([]);
    setActiveTab('layers');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const metadata: ImageMetadata = { width: img.naturalWidth, height: img.naturalHeight, src };
        setImageMetadata(metadata);
        const projectId = `proj-${file.name}-${Date.now()}`;
        setCurrentProjectId(projectId);

        const base64Data = src.split(',')[1];
        try {
          // Parallel analysis: layer detection + palette extraction
          const [detectedElements, localPalette] = await Promise.all([
            analyzeImageStructure(base64Data, file.type),
            extractPaletteFromImage(img, 4)
          ]);

          const processedLayers: Layer[] = [];
          let hasComposition = false;
          for (let i = 0; i < detectedElements.length; i++) {
            const element = detectedElements[i];
            const cropped = await cropImage(img, element.box_2d);
            if (cropped.w <= 0 || cropped.h <= 0) continue;
            if (element.category === LayerType.COMPOSITION) hasComposition = true;
            const layerId = `layer-${i}-${Date.now()}`;
            const jsonBreakdown = createLayerJsonBreakdown(
              element,
              { x: cropped.x, y: cropped.y, width: cropped.w, height: cropped.h, imageWidth: img.naturalWidth, imageHeight: img.naturalHeight },
              i,
              layerId
            );

            processedLayers.push({
              id: layerId,
              name: element.label,
              type: element.category,
              isVisible: element.category !== LayerType.COMPOSITION,
              box: { ymin: element.box_2d[0], xmin: element.box_2d[1], ymax: element.box_2d[2], xmax: element.box_2d[3] },
              imageSrc: cropped.url,
              originalX: cropped.x,
              originalY: cropped.y,
              width: cropped.w,
              height: cropped.h,
              visual_prompt: element.visual_prompt || `A high quality image of ${element.label}`,
              color_palette: element.color_palette,
              ocr_text: element.ocr_text,
              confidence: element.confidence,
              semantic_role: element.semantic_role || jsonBreakdown.semantic_role,
              depth: element.depth || jsonBreakdown.depth,
              z_index: element.z_index !== undefined ? element.z_index : jsonBreakdown.z_index,
              attributes: element.attributes || jsonBreakdown.attributes,
              json_breakdown: jsonBreakdown
            });
          }
          if (!hasComposition) {
            const elementsSummary = detectedElements
              .filter(e => e.category !== LayerType.COMPOSITION)
              .map(e => e.visual_prompt || e.label)
              .filter(Boolean)
              .slice(0, 5)
              .join(', ');

            const compLayerId = `layer-comp-${Date.now()}`;
            const compPrompt = elementsSummary
              ? `Master full-composition remix prompt: Complete visual artwork featuring ${elementsSummary}, with harmonious color palette, refined lighting, and balanced spatial composition.`
              : "Master full-composition remix prompt: Complete high-resolution artwork with balanced focal subjects, depth of field, studio lighting, and rich color harmony.";

            const compJsonBreakdown = createLayerJsonBreakdown(
              {
                label: "Full Composition",
                category: LayerType.COMPOSITION,
                box_2d: [0, 0, 1000, 1000],
                visual_prompt: compPrompt,
                semantic_role: "master composition blueprint",
                depth: "background",
                z_index: 0,
                attributes: ["composition", "master-prompt", "holistic-scene"]
              },
              { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight, imageWidth: img.naturalWidth, imageHeight: img.naturalHeight },
              -1,
              compLayerId
            );

            processedLayers.unshift({
              id: compLayerId,
              name: "Full Composition",
              type: LayerType.COMPOSITION,
              isVisible: false,
              box: { ymin: 0, xmin: 0, ymax: 1000, xmax: 1000 },
              imageSrc: src,
              originalX: 0,
              originalY: 0,
              width: img.naturalWidth,
              height: img.naturalHeight,
              visual_prompt: compPrompt,
              semantic_role: "master composition blueprint",
              depth: "background",
              z_index: 0,
              attributes: ["composition", "master-prompt", "holistic-scene"],
              json_breakdown: compJsonBreakdown
            });
          }

          const matchedPalette = associatePaletteWithLayers(localPalette, processedLayers);
          setPalette(matchedPalette);
          setLayers(processedLayers);
          
          // Select composition layer so the full remix prompt is immediately selected
          const compLayer = processedLayers.find(l => l.type === LayerType.COMPOSITION);
          if (compLayer) {
            setSelectedLayerIds([compLayer.id]);
          }

          setState(AppState.EDITING);
          
          await saveProject({
            id: projectId,
            name: file.name,
            timestamp: Date.now(),
            imageMetadata: { ...metadata, palette: matchedPalette },
            layers: processedLayers,
            palette: matchedPalette
          });
          loadRecentProjects();

          // In background, refine palette themes with Gemini
          deduceColorPalette(base64Data, file.type).then(aiPalette => {
            if (aiPalette && aiPalette.themeName) {
              setPalette(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  themeName: aiPalette.themeName,
                  themeDescription: aiPalette.themeDescription,
                  harmony: aiPalette.harmony,
                };
              });
            }
          }).catch(console.warn);

        } catch (err: any) {
          setErrorMsg(err.message || "Failed to analyze image.");
          setState(AppState.ERROR);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleLoadProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setImageMetadata(project.imageMetadata);
    setLayers(project.layers);
    setPalette(project.palette || project.imageMetadata.palette || createDefaultPalette());
    const compLayer = project.layers.find(l => l.type === LayerType.COMPOSITION);
    setSelectedLayerIds(compLayer ? [compLayer.id] : []);
    setState(AppState.EDITING);
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      loadRecentProjects();
      if (currentProjectId === id) {
        setState(AppState.LANDING);
        setCurrentProjectId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-screen w-screen bg-dark-950 flex flex-col font-sans text-gray-100 overflow-hidden select-none">
      {/* Responsive Application Header (for editor & analyzing states) */}
      {state !== AppState.LANDING && (
        <header className="h-14 border-b border-dark-800 bg-dark-900/90 backdrop-blur-md flex items-center justify-between px-3 sm:px-4 z-30 shrink-0">
          <div 
            id="app-brand-logo"
            className="flex items-center space-x-2 cursor-pointer transition-opacity hover:opacity-90" 
            onClick={() => setState(AppState.LANDING)}
          >
            <div className="w-7 h-7 bg-gradient-to-br from-brand-500 via-indigo-600 to-pink-500 rounded-lg flex items-center justify-center shadow-md shadow-brand-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight">
              Unflatten<span className="text-brand-500">AI</span>
            </span>
          </div>

          {state === AppState.EDITING && (
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setState(AppState.LANDING)}
                className="px-2 sm:px-3 text-xs"
                title="Return Home"
              >
                <Home className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Home</span>
              </Button>

              <div className="w-px h-5 bg-dark-800 mx-0.5 hidden xs:block"></div>

              {/* Toggle Deduced Color Palette Button */}
              {palette && (
                <button
                  id="header-palette-toggle-btn"
                  onClick={() => setShowPalettePanel(!showPalettePanel)}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-all ${
                    showPalettePanel 
                      ? 'bg-brand-500/20 border-brand-500/40 text-brand-300 shadow-sm' 
                      : 'bg-dark-800/80 border-dark-700 text-gray-300 hover:text-white'
                  }`}
                  title="Toggle Deduced Color Palette"
                >
                  <div className="flex items-center -space-x-1">
                    {palette.colors.slice(0, 3).map((c, i) => (
                      <span 
                        key={i} 
                        className="w-2.5 h-2.5 rounded-full border border-dark-900 shadow-xs inline-block" 
                        style={{ backgroundColor: c.hex }} 
                      />
                    ))}
                  </div>
                  <span className="hidden sm:inline">Palette</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-black/40 text-gray-400">
                    {palette.colors.length}
                  </span>
                </button>
              )}

              {/* Re-analyze Button */}
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleReanalyze} 
                className="px-2 sm:px-3 text-xs"
                title="Re-analyze Image with AI"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                <span className="hidden md:inline">Re-analyze</span>
              </Button>

              <div className="w-px h-5 bg-dark-800 mx-0.5 hidden xs:block"></div>

              {/* Download ZIP Button */}
              <Button 
                variant="primary" 
                size="sm" 
                disabled={isZipping} 
                onClick={handleExportZip}
                className="px-2.5 sm:px-4 text-xs font-bold shadow-lg shadow-brand-500/20"
                icon={<Download className="w-3.5 h-3.5" />}
              >
                <span className="hidden xs:inline">{isZipping ? "Zipping..." : "ZIP"}</span>
              </Button>
            </div>
          )}
        </header>
      )}

      {/* Main Workspace Area */}
      <main className="flex-1 relative flex overflow-hidden">
        {state === AppState.LANDING && (
          <LandingPage 
            onFileSelect={handleFileSelect} 
            recentProjects={recentProjects} 
            onLoadProject={handleLoadProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {state === AppState.ANALYZING && (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-6 bg-dark-950 px-4">
             <div className="relative w-24 h-24">
               <div className="absolute inset-0 border-4 border-dark-800 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
             </div>
             <div className="text-center">
               <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Deconstructing Image & Deducing Color Palette...</h3>
               <p className="text-sm text-gray-400 animate-pulse">Gemini AI is analyzing visible image layers, typography OCR, and color harmonies</p>
             </div>
          </div>
        )}

        {state === AppState.EDITING && imageMetadata && (
          <div className="flex-1 relative flex flex-col min-[900px]:flex-row overflow-hidden">
            {/* Center Canvas: occupies remaining width without overlay */}
            <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden bg-dark-950">
              <CanvasEditor 
                imageMetadata={imageMetadata}
                layers={layers}
                selectedLayerIds={selectedLayerIds}
                palette={palette || undefined}
                selectedColorHex={selectedColorHex}
                onSelectLayer={handleSelectLayer}
                onGenerateLayer={handleGenerateLayer}
                onUpdatePrompt={handleUpdatePrompt}
                onShufflePrompt={handleShufflePrompt}
                onDownloadLayer={downloadLayer}
                onLayerMove={handleLayerMove}
                onSelectColor={setSelectedColorHex}
                onToggleLayerPanel={() => setWorkspaceTab('layers')}
                onTogglePalettePanel={() => setWorkspaceTab('palette')}
                showPalettePanel={workspaceTab === 'palette'}
                showLayerPanel={workspaceTab === 'layers'}
                isShuffling={isShuffling}
              />
            </div>

            {/* Persistent Right Side Panel: 300-320px wide, 3-way tab switcher */}
            <WorkspaceSidePanel
              layers={layers}
              selectedLayerIds={selectedLayerIds}
              palette={palette}
              selectedColorHex={selectedColorHex}
              activeTab={workspaceTab}
              onTabChange={setWorkspaceTab}
              onSelectLayer={handleSelectLayer}
              onToggleVisibility={(id) => setLayers(prev => prev.map(l => l.id === id ? { ...l, isVisible: !l.isVisible } : l))}
              onDownloadLayer={downloadLayer}
              onMergeAndGenerate={handleMergeAndGenerate}
              isMerging={isMerging}
              onReanalyzeLayer={handleReanalyzeLayer}
              onSelectColor={setSelectedColorHex}
              onApplyColorToPrompt={handleApplyColorToPrompt}
              onHighlightLayersWithColor={handleHighlightLayersWithColor}
              onRededucePalette={handleRededucePalette}
              isRededucingPalette={isRededucingPalette}
              onUpdatePrompt={handleUpdatePrompt}
              onShufflePrompt={handleShufflePrompt}
              onGenerateLayer={handleGenerateLayer}
              isShuffling={isShuffling}
              imageMetadata={imageMetadata}
            />
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-dark-950 px-4">
             <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
             <h3 className="text-xl font-bold text-white">Something went wrong</h3>
             <p className="text-gray-400 text-center max-w-sm text-sm">{errorMsg || "We encountered an error while processing your image."}</p>
             <div className="flex items-center space-x-3 mt-2">
               {imageMetadata && (
                 <Button variant="primary" onClick={handleReanalyze} icon={<RefreshCw className="w-4 h-4" />}>
                   Try Again
                 </Button>
               )}
               <Button variant="secondary" onClick={() => setState(AppState.LANDING)}>Return Home</Button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
