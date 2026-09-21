import React, { useState, useEffect, useMemo } from 'react';
import { Layer, DeducedPalette, LayerType, ImageMetadata } from '../types';
import { ColorPaletteSection } from './ColorPaletteSection';
import { LayerList } from './LayerList';
import { 
  Sparkles, 
  RefreshCw, 
  Palette, 
  Copy, 
  Check, 
  Maximize2, 
  FileText, 
  Smartphone, 
  SlidersHorizontal 
} from 'lucide-react';
import { 
  FlyerPromptFields, 
  MasterPromptStructure, 
  DEFAULT_GLAMOUR_FLYER_FIELDS, 
  constructFlyerPrompt, 
  parseFlyerPrompt 
} from '../utils/promptTemplates';
import { FullRemixPromptModal } from './FullRemixPromptModal';

export type WorkspaceTab = 'composition' | 'palette' | 'layers';

interface WorkspaceSidePanelProps {
  layers: Layer[];
  selectedLayerIds: string[];
  palette: DeducedPalette | null;
  selectedColorHex: string | null;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onSelectLayer: (id: string, multi: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onDownloadLayer: (layer: Layer) => void;
  onMergeAndGenerate: () => void;
  isMerging: boolean;
  onReanalyzeLayer?: (id: string) => void;
  onSelectColor: (hex: string | null) => void;
  onApplyColorToPrompt?: (hex: string, colorName: string) => void;
  onHighlightLayersWithColor?: (layerIds: string[]) => void;
  onRededucePalette?: () => void;
  isRededucingPalette?: boolean;
  onUpdatePrompt: (layerId: string, newPrompt: string) => void;
  onShufflePrompt: (layerId: string) => void;
  onGenerateLayer: (layerId: string, prompt: string) => void;
  isShuffling?: string | null;
  imageMetadata?: ImageMetadata | null;
}

const DEFAULT_STYLES = [
  "3D Studio Render",
  "Cyberpunk Glow",
  "Pastel Aesthetic",
  "Golden Metallic",
  "Watercolor Splash",
  "Minimalist Vector",
  "Cinematic Film",
  "Anime Cel-Shaded"
];

function parsePromptFields(rawPrompt: string, layers: Layer[]) {
  let scene = "";
  let headlineText = "";
  let bodyText = "";
  let visualElements = "";
  let activeStyle = "3D Studio Render";

  // 1. Extract style tag
  for (const s of DEFAULT_STYLES) {
    const regex = new RegExp(`(?:Style:\\s*|art style:\\s*|,\\s*|\\+\\s*)?${s}`, 'i');
    if (regex.test(rawPrompt)) {
      activeStyle = s;
      break;
    }
  }

  // 2. Extract headline text
  const headlineMatch = rawPrompt.match(/(?:Typography & Text Overlay|Headline Text|Headline):\s*([^|.]+)/i);
  if (headlineMatch) {
    headlineText = headlineMatch[1].trim();
  } else {
    // Look for detected text layers
    const textLayers = layers.filter(l => l.type === LayerType.TEXT || (l.ocr_text && l.ocr_text.trim().length > 0));
    if (textLayers.length > 0) {
      headlineText = textLayers.map(l => l.ocr_text ? `"${l.ocr_text}"` : l.name).join('; ');
    } else {
      headlineText = "Zero-Shot Layer Deconstruction";
    }
  }

  // 3. Extract body text / subtext
  const bodyMatch = rawPrompt.match(/(?:Body Text|Subtext|Tagline):\s*([^|.]+)/i);
  if (bodyMatch) {
    bodyText = bodyMatch[1].trim();
  } else {
    bodyText = "High-precision neural segmentation with spatial depth hierarchy and chromatic deduction.";
  }

  // 4. Extract visual elements summary
  const visualMatch = rawPrompt.match(/(?:Visual Elements|Key Subjects|Elements Summary):\s*([^|.]+)/i);
  if (visualMatch) {
    visualElements = visualMatch[1].trim();
  } else {
    const subjects = layers
      .filter(l => l.type !== LayerType.COMPOSITION)
      .map(l => l.name.replace(/^Detected\s+/i, '').toLowerCase())
      .filter(Boolean);
    
    // Deduplicate
    const uniqueSubjects = Array.from(new Set(subjects)).slice(0, 7);
    visualElements = uniqueSubjects.length > 0 
      ? uniqueSubjects.join(', ')
      : "birds, clouds, foreground subjects, sky horizon";
  }

  // 5. Extract scene description
  let cleanScene = rawPrompt
    .replace(/^Master full-composition remix prompt:\s*/i, '')
    .replace(/\|\s*(?:Typography & Text Overlay|Headline Text|Headline):[^|]+/gi, '')
    .replace(/(?:Typography & Text Overlay|Headline Text|Headline):[^|.]+/gi, '')
    .replace(/\|\s*(?:Body Text|Subtext|Tagline):[^|]+/gi, '')
    .replace(/(?:Body Text|Subtext|Tagline):[^|.]+/gi, '')
    .replace(/\|\s*(?:Visual Elements|Key Subjects|Elements Summary):[^|]+/gi, '')
    .replace(/(?:Visual Elements|Key Subjects|Elements Summary):[^|.]+/gi, '')
    .replace(/\|\s*(?:Style|Art Style):[^|]+/gi, '')
    .replace(/(?:Style|Art Style):[^|.]+/gi, '')
    .trim();

  for (const s of DEFAULT_STYLES) {
    cleanScene = cleanScene.replace(new RegExp(`,?\\s*${s}`, 'gi'), '').trim();
  }
  cleanScene = cleanScene.replace(/^[,\s|]+|[,\s|]+$/g, '').trim();

  if (!cleanScene) {
    cleanScene = `Complete high-resolution visual artwork with balanced focal subjects, depth of field, studio lighting, and rich color harmony.`;
  }

  scene = cleanScene;

  return { scene, headlineText, bodyText, visualElements, activeStyle };
}

function constructPrompt(
  sceneStr: string, 
  headlineStr: string, 
  bodyStr: string,
  visualStr: string,
  styleStr: string
): string {
  const parts: string[] = [];
  if (sceneStr.trim()) {
    parts.push(sceneStr.trim());
  }
  if (visualStr.trim()) {
    parts.push(`Visual Elements: ${visualStr.trim()}`);
  }
  if (headlineStr.trim()) {
    parts.push(`Headline Text: ${headlineStr.trim()}`);
  }
  if (bodyStr.trim()) {
    parts.push(`Body Text: ${bodyStr.trim()}`);
  }
  if (styleStr.trim()) {
    parts.push(`Style: ${styleStr.trim()}`);
  }
  return parts.join(' | ');
}

export const WorkspaceSidePanel: React.FC<WorkspaceSidePanelProps> = ({
  layers,
  selectedLayerIds,
  palette,
  selectedColorHex,
  activeTab,
  onTabChange,
  onSelectLayer,
  onToggleVisibility,
  onDownloadLayer,
  onMergeAndGenerate,
  isMerging,
  onReanalyzeLayer,
  onSelectColor,
  onApplyColorToPrompt,
  onHighlightLayersWithColor,
  onRededucePalette,
  isRededucingPalette,
  onUpdatePrompt,
  onShufflePrompt,
  onGenerateLayer,
  isShuffling,
  imageMetadata
}) => {
  const [layersSubTab, setLayersSubTab] = useState<'layers' | 'json' | 'generated'>('layers');
  const [promptStructure, setPromptStructure] = useState<MasterPromptStructure>('flyer_9_16');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Find master composition layer
  const compositionLayer = useMemo(() => {
    return layers.find(l => l.type === LayerType.COMPOSITION) || layers[0];
  }, [layers]);

  const rawPrompt = compositionLayer?.visual_prompt || compositionLayer?.name || '';

  // Local state for 9:16 Social Flyer Brief
  const [flyerFields, setFlyerFields] = useState<FlyerPromptFields>(() => {
    return parseFlyerPrompt(rawPrompt, layers, palette);
  });

  // Local state for the 5 stacked studio composition fields
  const [scene, setScene] = useState("");
  const [headlineText, setHeadlineText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [visualElements, setVisualElements] = useState("");
  const [activeStyle, setActiveStyle] = useState("3D Studio Render");

  // Sync state whenever the underlying compositionLayer prompt changes externally
  useEffect(() => {
    if (rawPrompt) {
      // If the prompt already has flyer markers or user is in flyer mode, update flyerFields
      if (rawPrompt.includes('Core Design Brief') || rawPrompt.includes('Glamour Boutique')) {
        setFlyerFields(parseFlyerPrompt(rawPrompt, layers, palette));
        setPromptStructure('flyer_9_16');
      } else {
        const parsed = parsePromptFields(rawPrompt, layers);
        setScene(parsed.scene);
        setHeadlineText(parsed.headlineText);
        setBodyText(parsed.bodyText);
        setVisualElements(parsed.visualElements);
        setActiveStyle(parsed.activeStyle);
      }
    }
  }, [rawPrompt, layers, palette]);

  // Handle live edits to Flyer fields
  const handleFlyerFieldChange = (key: keyof FlyerPromptFields, value: any) => {
    const updated = { ...flyerFields, [key]: value };
    setFlyerFields(updated);
    if (compositionLayer) {
      const fullPrompt = constructFlyerPrompt(updated);
      onUpdatePrompt(compositionLayer.id, fullPrompt);
    }
  };

  // Handle live edits scoped to Scene field
  const handleSceneChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newScene = e.target.value;
    setScene(newScene);
    if (compositionLayer) {
      const fullPrompt = constructPrompt(newScene, headlineText, bodyText, visualElements, activeStyle);
      onUpdatePrompt(compositionLayer.id, fullPrompt);
    }
  };

  // Handle live edits scoped to Headline text field
  const handleHeadlineChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newHeadline = e.target.value;
    setHeadlineText(newHeadline);
    if (compositionLayer) {
      const fullPrompt = constructPrompt(scene, newHeadline, bodyText, visualElements, activeStyle);
      onUpdatePrompt(compositionLayer.id, fullPrompt);
    }
  };

  // Handle live edits scoped to Body text field
  const handleBodyTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBody = e.target.value;
    setBodyText(newBody);
    if (compositionLayer) {
      const fullPrompt = constructPrompt(scene, headlineText, newBody, visualElements, activeStyle);
      onUpdatePrompt(compositionLayer.id, fullPrompt);
    }
  };

  // Handle live edits scoped to Visual elements summary
  const handleVisualElementsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newVisual = e.target.value;
    setVisualElements(newVisual);
    if (compositionLayer) {
      const fullPrompt = constructPrompt(scene, headlineText, bodyText, newVisual, activeStyle);
      onUpdatePrompt(compositionLayer.id, fullPrompt);
    }
  };

  // Handle live swaps of Style chips
  const handleStyleSelect = (newStyle: string) => {
    setActiveStyle(newStyle);
    if (compositionLayer) {
      const fullPrompt = constructPrompt(scene, headlineText, bodyText, visualElements, newStyle);
      onUpdatePrompt(compositionLayer.id, fullPrompt);
    }
  };

  // Switch prompt structure
  const handleStructureSelect = (struct: MasterPromptStructure) => {
    setPromptStructure(struct);
    if (compositionLayer) {
      if (struct === 'flyer_9_16') {
        const fullPrompt = constructFlyerPrompt(flyerFields);
        onUpdatePrompt(compositionLayer.id, fullPrompt);
      } else {
        const fullPrompt = constructPrompt(scene, headlineText, bodyText, visualElements, activeStyle);
        onUpdatePrompt(compositionLayer.id, fullPrompt);
      }
    }
  };

  const getEffectivePrompt = () => {
    if (promptStructure === 'flyer_9_16') {
      return constructFlyerPrompt(flyerFields);
    }
    return constructPrompt(scene, headlineText, bodyText, visualElements, activeStyle);
  };

  const handleCopyPrompt = () => {
    const textToCopy = getEffectivePrompt();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      }).catch(() => {
        fallbackCopyText(textToCopy);
      });
    } else {
      fallbackCopyText(textToCopy);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleGenerate = () => {
    if (compositionLayer) {
      const fullPrompt = getEffectivePrompt();
      onGenerateLayer(compositionLayer.id, fullPrompt);
    }
  };

  const handleShuffle = () => {
    if (compositionLayer) {
      onShufflePrompt(compositionLayer.id);
    }
  };

  const isGeneratingComp = compositionLayer?.isGenerating || false;
  const isShufflingComp = isShuffling === compositionLayer?.id;

  const paletteCount = palette?.colors?.length ?? 4;
  const layersCount = layers.filter(l => l.type !== LayerType.COMPOSITION).length;

  return (
    <aside 
      id="workspace-side-panel"
      className="w-full min-[900px]:w-[320px] min-[900px]:min-w-[320px] min-[900px]:max-w-[320px] h-[520px] min-[900px]:h-full border-t min-[900px]:border-t-0 min-[900px]:border-l border-dark-800 bg-[#13161c] flex flex-col shrink-0 overflow-hidden select-none z-20"
    >
      {/* 3-WAY TAB SWITCHER AT TOP */}
      <div className="p-3 border-b border-dark-800 bg-[#0f1117] shrink-0">
        <div className="grid grid-cols-3 gap-1 bg-[#090b0e] p-1 rounded-xl border border-dark-800">
          <button
            id="tab-composition-btn"
            type="button"
            onClick={() => onTabChange('composition')}
            className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all truncate text-center cursor-pointer ${
              activeTab === 'composition'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            Composition
          </button>
          <button
            id="tab-palette-btn"
            type="button"
            onClick={() => onTabChange('palette')}
            className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all truncate text-center cursor-pointer ${
              activeTab === 'palette'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            Palette · {paletteCount}
          </button>
          <button
            id="tab-layers-btn"
            type="button"
            onClick={() => onTabChange('layers')}
            className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all truncate text-center cursor-pointer ${
              activeTab === 'layers'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-xs'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            Layers · {layersCount}
          </button>
        </div>
      </div>

      {/* TAB CONTENT: EXACTLY ONE SHOWS AT A TIME */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* 1. COMPOSITION TAB */}
        {activeTab === 'composition' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Structure Switcher Bar */}
            <div className="px-3.5 py-2.5 bg-[#090b10] border-b border-dark-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-1.5 bg-[#12151d] p-0.5 rounded-lg border border-dark-700 text-[11px]">
                <button
                  id="sidepanel-struct-flyer-btn"
                  type="button"
                  onClick={() => handleStructureSelect('flyer_9_16')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                    promptStructure === 'flyer_9_16'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Professional 9:16 Social Media Flyer Brief (Glamour Boutique style)"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>9:16 Flyer</span>
                </button>
                <button
                  id="sidepanel-struct-studio-btn"
                  type="button"
                  onClick={() => handleStructureSelect('studio_remix')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                    promptStructure === 'studio_remix'
                      ? 'bg-brand-500/30 text-brand-300 font-bold border border-brand-500/40'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Studio Multi-Field Breakdown"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Studio</span>
                </button>
              </div>

              {/* View & Edit Full Prompt Modal Trigger */}
              <div className="flex items-center space-x-1">
                <button
                  id="sidepanel-copy-quick-btn"
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center space-x-1 transition-all cursor-pointer ${
                    copiedPrompt
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                  }`}
                  title="Copy formatted prompt to clipboard"
                >
                  {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  id="sidepanel-open-modal-btn"
                  type="button"
                  onClick={() => setIsPromptModalOpen(true)}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-brand-300 flex items-center space-x-1 transition-all cursor-pointer"
                  title="View and edit complete prompt in large editor"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Edit Full</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Fields */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
              {promptStructure === 'flyer_9_16' ? (
                /* 9:16 SOCIAL MEDIA FLYER BRIEF FIELDS */
                <>
                  {/* Theme & Specific Hex Color Codes */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#0a0d14] border border-dark-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                        1. Theme & Color Palette
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-900/40">
                        Aspect: 9:16
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400">Concept</label>
                      <input
                        type="text"
                        value={flyerFields.concept}
                        onChange={(e) => handleFlyerFieldChange('concept', e.target.value)}
                        className="w-full bg-[#11141e] border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                        placeholder="e.g. Elegant, modern, and minimalist"
                      />
                    </div>

                    {/* Strict Hex Color Codes */}
                    <div className="pt-1">
                      <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                        Specific Palette (Strict Hexes)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {/* Primary Blue */}
                        <div className="flex items-center space-x-1.5 bg-[#11141e] border border-dark-700 rounded-lg p-1.5">
                          <input
                            type="color"
                            value={flyerFields.primaryBlueHex.startsWith('#') ? flyerFields.primaryBlueHex : '#1e3a8a'}
                            onChange={(e) => handleFlyerFieldChange('primaryBlueHex', e.target.value)}
                            className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[9px] text-gray-400 block truncate">Primary</span>
                            <input
                              type="text"
                              value={flyerFields.primaryBlueHex}
                              onChange={(e) => handleFlyerFieldChange('primaryBlueHex', e.target.value)}
                              className="w-full bg-transparent text-[11px] font-mono font-bold text-white focus:outline-none truncate"
                            />
                          </div>
                        </div>

                        {/* Silver Accent */}
                        <div className="flex items-center space-x-1.5 bg-[#11141e] border border-dark-700 rounded-lg p-1.5">
                          <input
                            type="color"
                            value={flyerFields.silverAccentHex.startsWith('#') ? flyerFields.silverAccentHex : '#94a3b8'}
                            onChange={(e) => handleFlyerFieldChange('silverAccentHex', e.target.value)}
                            className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[9px] text-gray-400 block truncate">Silver</span>
                            <input
                              type="text"
                              value={flyerFields.silverAccentHex}
                              onChange={(e) => handleFlyerFieldChange('silverAccentHex', e.target.value)}
                              className="w-full bg-transparent text-[11px] font-mono font-bold text-white focus:outline-none truncate"
                            />
                          </div>
                        </div>

                        {/* Gold Highlight */}
                        <div className="flex items-center space-x-1.5 bg-[#11141e] border border-dark-700 rounded-lg p-1.5">
                          <input
                            type="color"
                            value={flyerFields.goldHighlightHex.startsWith('#') ? flyerFields.goldHighlightHex : '#fbbf24'}
                            onChange={(e) => handleFlyerFieldChange('goldHighlightHex', e.target.value)}
                            className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[9px] text-gray-400 block truncate">Gold</span>
                            <input
                              type="text"
                              value={flyerFields.goldHighlightHex}
                              onChange={(e) => handleFlyerFieldChange('goldHighlightHex', e.target.value)}
                              className="w-full bg-transparent text-[11px] font-mono font-bold text-white focus:outline-none truncate"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Text & Typography */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#0a0d14] border border-dark-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                      2. Text & Typography
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400">Main Title / Brand</label>
                        <input
                          type="text"
                          value={flyerFields.brandName}
                          onChange={(e) => handleFlyerFieldChange('brandName', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none font-semibold"
                          placeholder='e.g. "Glamour Boutique"'
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400">Tagline</label>
                        <input
                          type="text"
                          value={flyerFields.tagline}
                          onChange={(e) => handleFlyerFieldChange('tagline', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:border-brand-500 focus:outline-none italic"
                          placeholder='e.g. "Where Fashion Meets Art"'
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400">Typography Style</label>
                        <input
                          type="text"
                          value={flyerFields.typographyStyle}
                          onChange={(e) => handleFlyerFieldChange('typographyStyle', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:border-brand-500 focus:outline-none"
                          placeholder="e.g. Elegant Serif with a glowing/premium effect"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Offerings Section */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#0a0d14] border border-dark-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                        3. Content & Offerings
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-[9px] text-gray-400">Section:</span>
                        <input
                          type="text"
                          value={flyerFields.sectionTitle}
                          onChange={(e) => handleFlyerFieldChange('sectionTitle', e.target.value)}
                          className="bg-[#11141e] border border-dark-700 rounded px-1.5 py-0.5 text-[11px] text-amber-300 font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={flyerFields.offerings.join('\n')}
                      onChange={(e) => handleFlyerFieldChange('offerings', e.target.value.split('\n'))}
                      className="w-full bg-[#11141e] border border-dark-700 rounded-lg p-2 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                      placeholder="One item per line (e.g. Custom Kaftans)"
                    />
                  </div>

                  {/* Visuals & Display */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#0a0d14] border border-dark-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                      4. Visuals & Display
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400">Product Visuals</label>
                        <textarea
                          rows={2}
                          value={flyerFields.productVisuals}
                          onChange={(e) => handleFlyerFieldChange('productVisuals', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded-lg p-2 text-xs text-white focus:border-brand-500 focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400">Display Arrangement</label>
                        <input
                          type="text"
                          value={flyerFields.displayArrangement}
                          onChange={(e) => handleFlyerFieldChange('displayArrangement', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400">Background & Lighting</label>
                        <input
                          type="text"
                          value={flyerFields.backgroundTexture}
                          onChange={(e) => handleFlyerFieldChange('backgroundTexture', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact & CTA */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#0a0d14] border border-dark-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                      5. Layout & Contact Details
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-semibold text-gray-400 block">Call to Action</label>
                        <input
                          type="text"
                          value={flyerFields.callToAction}
                          onChange={(e) => handleFlyerFieldChange('callToAction', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-400 block">Phone</label>
                        <input
                          type="text"
                          value={flyerFields.phone}
                          onChange={(e) => handleFlyerFieldChange('phone', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded px-2 py-1 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-400 block">Social Media</label>
                        <input
                          type="text"
                          value={flyerFields.socialMedia}
                          onChange={(e) => handleFlyerFieldChange('socialMedia', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded px-2 py-1 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-400 block">Location</label>
                        <input
                          type="text"
                          value={flyerFields.location}
                          onChange={(e) => handleFlyerFieldChange('location', e.target.value)}
                          className="w-full bg-[#11141e] border border-dark-700 rounded px-2 py-1 text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* STUDIO 5-FIELD COMPOSITION */
                <>
                  {/* Field 1: Scene */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-scene" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Scene
                      </label>
                      <span className="text-[9px] text-gray-500 font-mono">
                        Theme & Mood
                      </span>
                    </div>
                    <textarea
                      id="field-scene"
                      value={scene}
                      onChange={handleSceneChange}
                      rows={3}
                      className="w-full bg-[#0d0f14] border border-dark-800 hover:border-dark-700 focus:border-brand-500/50 rounded-xl p-3 text-xs text-gray-100 font-sans leading-relaxed resize-none focus:outline-none transition-colors shadow-inner"
                      placeholder="Describe the overall scene, mood, lighting, and ambient setting..."
                    />
                  </div>

                  {/* Field 2: Headline text */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-headline" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Headline text
                      </label>
                      <span className="text-[9px] text-gray-500 font-mono">
                        Primary Typography
                      </span>
                    </div>
                    <input
                      id="field-headline"
                      type="text"
                      value={headlineText}
                      onChange={handleHeadlineChange}
                      className="w-full bg-[#0d0f14] border border-dark-800 hover:border-dark-700 focus:border-brand-500/50 rounded-xl px-3 py-2 text-xs text-gray-100 font-sans focus:outline-none transition-colors shadow-inner"
                      placeholder="Primary text or headline overlay..."
                    />
                  </div>

                  {/* Field 3: Body text */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-body-text" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Body text
                      </label>
                      <span className="text-[9px] text-gray-500 font-mono">
                        Subtext & Tagline
                      </span>
                    </div>
                    <textarea
                      id="field-body-text"
                      value={bodyText}
                      onChange={handleBodyTextChange}
                      rows={2}
                      className="w-full bg-[#0d0f14] border border-dark-800 hover:border-dark-700 focus:border-brand-500/50 rounded-xl p-3 text-xs text-gray-100 font-sans leading-relaxed resize-none focus:outline-none transition-colors shadow-inner"
                      placeholder="Secondary copy, subtitle, or supporting text..."
                    />
                  </div>

                  {/* Field 4: Visual elements summary */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-visual-elements" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Visual elements summary
                      </label>
                      <span className="text-[9px] text-gray-500 font-mono">
                        Subjects & Objects
                      </span>
                    </div>
                    <textarea
                      id="field-visual-elements"
                      value={visualElements}
                      onChange={handleVisualElementsChange}
                      rows={2}
                      className="w-full bg-[#0d0f14] border border-dark-800 hover:border-dark-700 focus:border-brand-500/50 rounded-xl p-3 text-xs text-gray-100 font-sans leading-relaxed resize-none focus:outline-none transition-colors shadow-inner"
                      placeholder="e.g. birds, clouds, trees, mountain silhouette, sun"
                    />
                  </div>

                  {/* Field 5: Style tags */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Style tags / mood keywords
                      </label>
                      <span className="text-[9px] text-brand-300 font-medium truncate max-w-[140px]">
                        {activeStyle}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {DEFAULT_STYLES.map((styleOption) => {
                        const isActive = activeStyle === styleOption;
                        return (
                          <button
                            key={styleOption}
                            type="button"
                            onClick={() => handleStyleSelect(styleOption)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none ${
                              isActive
                                ? 'bg-brand-500/20 text-brand-300 border-brand-500/50 font-semibold shadow-xs'
                                : 'bg-[#0d0f14] text-gray-400 border-dark-800 hover:border-dark-700 hover:text-gray-200'
                            }`}
                          >
                            {styleOption}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Pinned Bottom Actions */}
            <div className="p-3.5 border-t border-dark-800 bg-[#0f1117] space-y-2 mt-auto shrink-0 shadow-lg">
              <button
                id="sidepanel-generate-btn"
                type="button"
                onClick={handleGenerate}
                disabled={isGeneratingComp}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-brand-500/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isGeneratingComp 
                    ? "Generating Artwork..." 
                    : promptStructure === 'flyer_9_16'
                      ? "Generate 9:16 Flyer Artwork"
                      : "Generate Artwork"}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="sidepanel-edit-full-prompt-btn"
                  type="button"
                  onClick={() => setIsPromptModalOpen(true)}
                  className="w-full bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-brand-300" />
                  <span>View / Edit Prompt</span>
                </button>

                <button
                  id="sidepanel-shuffle-btn"
                  type="button"
                  onClick={handleShuffle}
                  disabled={isShufflingComp}
                  className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-200 border border-white/10 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isShufflingComp ? 'animate-spin text-brand-400' : ''}`} />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. PALETTE TAB */}
        {activeTab === 'palette' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {palette ? (
              <ColorPaletteSection
                palette={palette}
                layers={layers}
                selectedColorHex={selectedColorHex}
                onSelectColor={onSelectColor}
                onApplyColorToPrompt={onApplyColorToPrompt}
                onHighlightLayersWithColor={onHighlightLayersWithColor}
                onRededucePalette={onRededucePalette}
                isRededucing={isRededucingPalette}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                <Palette className="w-8 h-8 mb-2 text-gray-600" />
                <p className="text-xs">No color palette available.</p>
              </div>
            )}
          </div>
        )}

        {/* 3. LAYERS TAB */}
        {activeTab === 'layers' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <LayerList
              layers={layers}
              selectedLayerIds={selectedLayerIds}
              onSelectLayer={onSelectLayer}
              onToggleVisibility={onToggleVisibility}
              onDownloadLayer={onDownloadLayer}
              activeTab={layersSubTab}
              onTabChange={setLayersSubTab}
              onMergeAndGenerate={onMergeAndGenerate}
              isMerging={isMerging}
              onReanalyzeLayer={onReanalyzeLayer}
              imageMetadata={imageMetadata}
              palette={palette}
            />
          </div>
        )}
      </div>

      {/* Full Remix Master Prompt Modal Dialog */}
      <FullRemixPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        rawPrompt={getEffectivePrompt()}
        onSavePrompt={(newPrompt) => {
          if (compositionLayer) {
            onUpdatePrompt(compositionLayer.id, newPrompt);
            if (newPrompt.includes('Core Design Brief') || newPrompt.includes('Glamour Boutique')) {
              setFlyerFields(parseFlyerPrompt(newPrompt, layers, palette));
              setPromptStructure('flyer_9_16');
            }
          }
        }}
        onGeneratePrompt={(promptToGen) => {
          if (compositionLayer) {
            onGenerateLayer(compositionLayer.id, promptToGen);
          }
        }}
        isGenerating={isGeneratingComp}
        layers={layers}
        palette={palette}
        activeStructure={promptStructure}
        onStructureChange={(struct) => setPromptStructure(struct)}
      />
    </aside>
  );
};
