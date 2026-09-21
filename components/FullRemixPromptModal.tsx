import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  Sliders, 
  FileText, 
  RotateCcw, 
  Download, 
  Palette,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { Layer, DeducedPalette } from '../types';
import { 
  FlyerPromptFields, 
  MasterPromptStructure, 
  DEFAULT_GLAMOUR_FLYER_FIELDS, 
  constructFlyerPrompt, 
  parseFlyerPrompt 
} from '../utils/promptTemplates';

interface FullRemixPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawPrompt: string;
  onSavePrompt: (newPrompt: string) => void;
  onGeneratePrompt?: (prompt: string) => void;
  isGenerating?: boolean;
  layers?: Layer[];
  palette?: DeducedPalette | null;
  activeStructure?: MasterPromptStructure;
  onStructureChange?: (structure: MasterPromptStructure) => void;
}

export const FullRemixPromptModal: React.FC<FullRemixPromptModalProps> = ({
  isOpen,
  onClose,
  rawPrompt,
  onSavePrompt,
  onGeneratePrompt,
  isGenerating = false,
  layers = [],
  palette = null,
  activeStructure = 'flyer_9_16',
  onStructureChange
}) => {
  const [selectedStructure, setSelectedStructure] = useState<MasterPromptStructure>(activeStructure);
  const [viewMode, setViewMode] = useState<'editor' | 'form'>('editor');
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // Raw text state (editable directly)
  const [fullPromptText, setFullPromptText] = useState<string>('');

  // Structured flyer state
  const [flyerFields, setFlyerFields] = useState<FlyerPromptFields>(() => {
    return parseFlyerPrompt(rawPrompt, layers, palette);
  });

  // Keep internal structure in sync with prop
  useEffect(() => {
    setSelectedStructure(activeStructure);
  }, [activeStructure]);

  // When modal opens or rawPrompt changes, populate fields
  useEffect(() => {
    if (isOpen) {
      if (rawPrompt && (rawPrompt.includes('Core Design Brief') || rawPrompt.includes('Glamour Boutique'))) {
        setFullPromptText(rawPrompt);
        setFlyerFields(parseFlyerPrompt(rawPrompt, layers, palette));
        setSelectedStructure('flyer_9_16');
      } else if (rawPrompt) {
        // If user already has a prompt, check whether we should construct flyer or keep prompt
        if (selectedStructure === 'flyer_9_16') {
          const parsed = parseFlyerPrompt(rawPrompt, layers, palette);
          setFlyerFields(parsed);
          setFullPromptText(constructFlyerPrompt(parsed));
        } else {
          setFullPromptText(rawPrompt);
        }
      } else {
        const defaultText = constructFlyerPrompt(DEFAULT_GLAMOUR_FLYER_FIELDS);
        setFullPromptText(defaultText);
        setFlyerFields(DEFAULT_GLAMOUR_FLYER_FIELDS);
      }
    }
  }, [isOpen, rawPrompt]);

  // When flyer fields change in 'form' mode, update full prompt text
  const handleFlyerFieldChange = (key: keyof FlyerPromptFields, value: any) => {
    const updated = { ...flyerFields, [key]: value };
    setFlyerFields(updated);
    const constructed = constructFlyerPrompt(updated);
    setFullPromptText(constructed);
    onSavePrompt(constructed);
  };

  // When user edits raw text directly in 'editor' mode
  const handleRawTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setFullPromptText(newText);
    onSavePrompt(newText);
    if (selectedStructure === 'flyer_9_16') {
      const parsed = parseFlyerPrompt(newText, layers, palette);
      setFlyerFields(parsed);
    }
  };

  // Switch between structures
  const handleStructureSelect = (struct: MasterPromptStructure) => {
    setSelectedStructure(struct);
    if (onStructureChange) onStructureChange(struct);

    if (struct === 'flyer_9_16') {
      const constructed = constructFlyerPrompt(flyerFields);
      setFullPromptText(constructed);
      onSavePrompt(constructed);
    } else if (struct === 'studio_remix') {
      const summaryText = layers
        .filter(l => l.name)
        .slice(0, 5)
        .map(l => l.name)
        .join(', ');
      const studioText = `Master full-composition remix prompt: Complete visual artwork featuring ${summaryText || 'focal subjects and atmospheric environment'}, with harmonious color palette, refined lighting, and balanced spatial composition. | Style: 3D Studio Render`;
      setFullPromptText(studioText);
      onSavePrompt(studioText);
    }
  };

  // Copy to clipboard with fallback
  const handleCopy = () => {
    if (!fullPromptText) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullPromptText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }).catch(() => {
        fallbackCopy(fullPromptText);
      });
    } else {
      fallbackCopy(fullPromptText);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.warn('Fallback copy error', e);
    }
  };

  // Reset to default Glamour Boutique brief
  const handleResetToGlamour = () => {
    setFlyerFields(DEFAULT_GLAMOUR_FLYER_FIELDS);
    const text = constructFlyerPrompt(DEFAULT_GLAMOUR_FLYER_FIELDS);
    setFullPromptText(text);
    onSavePrompt(text);
  };

  // Download as markdown file
  const handleDownloadMd = () => {
    const blob = new Blob([fullPromptText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `master-remix-prompt-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Insert colors from extracted palette into flyer hex fields
  const handleInjectExtractedPalette = () => {
    if (!palette || !palette.colors || palette.colors.length === 0) return;
    const c1 = palette.colors[0]?.hex || flyerFields.primaryBlueHex;
    const c2 = palette.colors[1]?.hex || flyerFields.silverAccentHex;
    const c3 = palette.colors[2]?.hex || flyerFields.goldHighlightHex;
    const summary = `${palette.themeName || 'Extracted'} palette with ${c1}, ${c2}, and ${c3}`;

    const updated: FlyerPromptFields = {
      ...flyerFields,
      primaryBlueHex: c1,
      silverAccentHex: c2,
      goldHighlightHex: c3,
      colorSchemeSummary: summary
    };
    setFlyerFields(updated);
    const text = constructFlyerPrompt(updated);
    setFullPromptText(text);
    onSavePrompt(text);
  };

  // Character and word stats
  const charCount = fullPromptText.length;
  const wordCount = fullPromptText.trim().split(/\s+/).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div 
      id="full-remix-prompt-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        id="full-remix-prompt-modal-container"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#10131a] border border-dark-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-dark-800 bg-[#0c0e14] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-400 flex items-center justify-center shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Full Remix Master Prompt
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {selectedStructure === 'flyer_9_16' ? '9:16 Social Flyer' : 'Studio Remix'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Inspect, edit, and fine-tune prompt structure before generating or copying.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle: Raw Editor vs Structured Form */}
            <div className="flex items-center bg-[#07080c] border border-dark-800 p-0.5 rounded-xl">
              <button
                id="modal-view-editor-btn"
                type="button"
                onClick={() => setViewMode('editor')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'editor'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Direct Raw Markdown/Text Editor"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Text Editor</span>
              </button>
              <button
                id="modal-view-form-btn"
                type="button"
                onClick={() => setViewMode('form')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'form'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Structured Form Fields"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Structured Form</span>
              </button>
            </div>

            <button
              id="modal-close-btn"
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STRUCTURE SELECTOR BAR */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#090b0f] border-b border-dark-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Prompt Structure:
            </span>
            <div className="flex items-center space-x-1.5 bg-[#12161f] p-1 rounded-xl border border-dark-700">
              <button
                id="struct-flyer-btn"
                type="button"
                onClick={() => handleStructureSelect('flyer_9_16')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedStructure === 'flyer_9_16'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                📱 9:16 Social Media Flyer Brief
              </button>
              <button
                id="struct-studio-btn"
                type="button"
                onClick={() => handleStructureSelect('studio_remix')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedStructure === 'studio_remix'
                    ? 'bg-brand-500/30 text-brand-300 font-bold border border-brand-500/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                🎨 Studio Multi-Field
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-mono">
            {selectedStructure === 'flyer_9_16' && (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-950/40 border border-blue-800/40 text-blue-300">
                <span>Aspect Ratio:</span>
                <span className="font-bold text-amber-300">{flyerFields.aspectRatio}</span>
              </span>
            )}
            <span>{charCount} chars</span>
            <span>•</span>
            <span>{wordCount} words</span>
          </div>
        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-4 sm:p-5">
          {viewMode === 'editor' ? (
            /* RAW TEXTAREA / MARKDOWN EDITOR */
            <div className="flex flex-col h-full space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-brand-400" />
                  <span>
                    Directly edit any word, hex code, or instruction below. Edits synchronize in real-time.
                  </span>
                </span>
                <div className="flex items-center space-x-1.5">
                  {palette && palette.colors.length > 0 && (
                    <button
                      id="modal-inject-palette-btn"
                      type="button"
                      onClick={handleInjectExtractedPalette}
                      className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-700 flex items-center space-x-1 transition-all cursor-pointer"
                      title="Inject deduced palette hex codes into flyer brief"
                    >
                      <Palette className="w-3 h-3 text-amber-400" />
                      <span>Apply Palette Hexes</span>
                    </button>
                  )}
                  <button
                    id="modal-reset-brief-btn"
                    type="button"
                    onClick={handleResetToGlamour}
                    className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-700 flex items-center space-x-1 transition-all cursor-pointer"
                    title="Reset to default Glamour Boutique brief"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                </div>
              </div>

              <div className="relative flex-1 min-h-[360px] sm:min-h-[420px] rounded-xl border border-dark-700 bg-[#090b0e] overflow-hidden focus-within:border-brand-500/60 transition-colors shadow-inner">
                <textarea
                  id="full-prompt-raw-textarea"
                  value={fullPromptText}
                  onChange={handleRawTextChange}
                  className="w-full h-full p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-gray-100 bg-transparent resize-none focus:outline-none custom-scrollbar"
                  placeholder="Type or edit master prompt here..."
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            /* STRUCTURED FORM VIEW */
            <div className="space-y-4">
              {/* Aspect Ratio Selector */}
              <div className="p-3.5 rounded-xl bg-[#090b0e] border border-dark-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-gray-200">Social Media Aspect Ratio</span>
                  <p className="text-[11px] text-gray-400">Required format for target platform rendering</p>
                </div>
                <div className="flex items-center space-x-1.5">
                  {[
                    { id: '9:16', label: '9:16 (Reels/Stories/TikTok)', icon: '📱' },
                    { id: '1:1', label: '1:1 (Square Post)', icon: '◻️' },
                    { id: '16:9', label: '16:9 (Landscape Banner)', icon: '🖥️' },
                    { id: '4:5', label: '4:5 (Portrait Feed)', icon: '🖼️' },
                  ].map((ar) => (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => handleFlyerFieldChange('aspectRatio', ar.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                        flyerFields.aspectRatio === ar.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-[#13161f] text-gray-400 hover:text-white border border-dark-700'
                      }`}
                    >
                      <span>{ar.icon}</span>
                      <span>{ar.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 1: Theme & Branding */}
              <div className="p-4 rounded-xl bg-[#090b0e] border border-dark-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
                    <span>1. Theme & Branding</span>
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">Concept & Color Codes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Concept</label>
                    <input
                      type="text"
                      value={flyerFields.concept}
                      onChange={(e) => handleFlyerFieldChange('concept', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                      placeholder="e.g. Elegant, modern, and minimalist"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Color Scheme Summary</label>
                    <input
                      type="text"
                      value={flyerFields.colorSchemeSummary}
                      onChange={(e) => handleFlyerFieldChange('colorSchemeSummary', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                      placeholder="e.g. Deep blues and silvers with a touch of gold"
                    />
                  </div>
                </div>

                {/* Hex Color Palette Inputs */}
                <div className="pt-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">
                    Specific Color Palette (Strict Hex Codes)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Primary Blue */}
                    <div className="flex items-center space-x-2 bg-[#131720] border border-dark-700 rounded-lg p-2">
                      <input
                        type="color"
                        value={flyerFields.primaryBlueHex.startsWith('#') ? flyerFields.primaryBlueHex : '#1e3a8a'}
                        onChange={(e) => handleFlyerFieldChange('primaryBlueHex', e.target.value)}
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-400 block font-medium">Primary Color</span>
                        <input
                          type="text"
                          value={flyerFields.primaryBlueHex}
                          onChange={(e) => handleFlyerFieldChange('primaryBlueHex', e.target.value)}
                          className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Silver Accent */}
                    <div className="flex items-center space-x-2 bg-[#131720] border border-dark-700 rounded-lg p-2">
                      <input
                        type="color"
                        value={flyerFields.silverAccentHex.startsWith('#') ? flyerFields.silverAccentHex : '#94a3b8'}
                        onChange={(e) => handleFlyerFieldChange('silverAccentHex', e.target.value)}
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-400 block font-medium">Silver Accent</span>
                        <input
                          type="text"
                          value={flyerFields.silverAccentHex}
                          onChange={(e) => handleFlyerFieldChange('silverAccentHex', e.target.value)}
                          className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Gold Highlight */}
                    <div className="flex items-center space-x-2 bg-[#131720] border border-dark-700 rounded-lg p-2">
                      <input
                        type="color"
                        value={flyerFields.goldHighlightHex.startsWith('#') ? flyerFields.goldHighlightHex : '#fbbf24'}
                        onChange={(e) => handleFlyerFieldChange('goldHighlightHex', e.target.value)}
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-400 block font-medium">Gold Highlight</span>
                        <input
                          type="text"
                          value={flyerFields.goldHighlightHex}
                          onChange={(e) => handleFlyerFieldChange('goldHighlightHex', e.target.value)}
                          className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Text & Typography */}
              <div className="p-4 rounded-xl bg-[#090b0e] border border-dark-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  2. Text & Typography
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Main Title / Brand Name</label>
                    <input
                      type="text"
                      value={flyerFields.brandName}
                      onChange={(e) => handleFlyerFieldChange('brandName', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                      placeholder='e.g. "Glamour Boutique"'
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tagline</label>
                    <input
                      type="text"
                      value={flyerFields.tagline}
                      onChange={(e) => handleFlyerFieldChange('tagline', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                      placeholder='e.g. "Where Fashion Meets Art"'
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Typography Style & Rendering Instruction</label>
                  <textarea
                    rows={2}
                    value={flyerFields.typographyStyle}
                    onChange={(e) => handleFlyerFieldChange('typographyStyle', e.target.value)}
                    className="w-full bg-[#131720] border border-dark-700 rounded-lg p-2.5 text-xs text-white focus:border-brand-500 focus:outline-none resize-none"
                    placeholder="e.g. Elegant Serif with a glowing/premium effect. The text must be perfectly rendered, clear, and stylistically consistent with the theme."
                  />
                </div>
              </div>

              {/* Section 3: Content & Offerings */}
              <div className="p-4 rounded-xl bg-[#090b0e] border border-dark-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    3. Content & Offerings
                  </h4>
                  <div className="flex items-center space-x-1">
                    <label className="text-[10px] text-gray-400 font-medium">Section Name:</label>
                    <input
                      type="text"
                      value={flyerFields.sectionTitle}
                      onChange={(e) => handleFlyerFieldChange('sectionTitle', e.target.value)}
                      className="bg-[#131720] border border-dark-700 rounded px-2 py-0.5 text-xs text-amber-300 font-bold focus:outline-none"
                      placeholder="New Arrivals"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block">
                    Product / Offering Items (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={flyerFields.offerings.join('\n')}
                    onChange={(e) => {
                      const items = e.target.value.split('\n');
                      handleFlyerFieldChange('offerings', items);
                    }}
                    className="w-full bg-[#131720] border border-dark-700 rounded-lg p-2.5 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                    placeholder="Custom Kaftans&#10;Designer Suits&#10;Handcrafted T-shirts"
                  />
                </div>
              </div>

              {/* Section 4: Visuals & Display */}
              <div className="p-4 rounded-xl bg-[#090b0e] border border-dark-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  4. Visuals & Display
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Product/Service Visuals</label>
                    <textarea
                      rows={2}
                      value={flyerFields.productVisuals}
                      onChange={(e) => handleFlyerFieldChange('productVisuals', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg p-2 text-xs text-white focus:border-brand-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Display Arrangement</label>
                    <textarea
                      rows={2}
                      value={flyerFields.displayArrangement}
                      onChange={(e) => handleFlyerFieldChange('displayArrangement', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg p-2 text-xs text-white focus:border-brand-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Background</label>
                    <input
                      type="text"
                      value={flyerFields.backgroundTexture}
                      onChange={(e) => handleFlyerFieldChange('backgroundTexture', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Lighting & Special Effects</label>
                    <input
                      type="text"
                      value={flyerFields.lighting}
                      onChange={(e) => handleFlyerFieldChange('lighting', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Layout & Contact Details */}
              <div className="p-4 rounded-xl bg-[#090b0e] border border-dark-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  5. Layout & Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Call To Action (CTA)</label>
                    <input
                      type="text"
                      value={flyerFields.callToAction}
                      onChange={(e) => handleFlyerFieldChange('callToAction', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-amber-300 font-bold focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
                    <input
                      type="text"
                      value={flyerFields.phone}
                      onChange={(e) => handleFlyerFieldChange('phone', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Social Media</label>
                    <input
                      type="text"
                      value={flyerFields.socialMedia}
                      onChange={(e) => handleFlyerFieldChange('socialMedia', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Location</label>
                    <input
                      type="text"
                      value={flyerFields.location}
                      onChange={(e) => handleFlyerFieldChange('location', e.target.value)}
                      className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Style & Finish */}
              <div className="p-4 rounded-xl bg-[#090b0e] border border-dark-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  6. Style & Finish
                </h4>
                <input
                  type="text"
                  value={flyerFields.overallFinish}
                  onChange={(e) => handleFlyerFieldChange('overallFinish', e.target.value)}
                  className="w-full bg-[#131720] border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. Premium, glossy, luxury retail look"
                />
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 border-t border-dark-800 bg-[#0c0e14] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              id="modal-download-btn"
              type="button"
              onClick={handleDownloadMd}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .md</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Copy Prompt Button */}
            <button
              id="modal-copy-prompt-btn"
              type="button"
              onClick={handleCopy}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-white" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>

            {/* Generate Image Button (Optional) */}
            {onGeneratePrompt && (
              <button
                id="modal-generate-btn"
                type="button"
                onClick={() => onGeneratePrompt(fullPromptText)}
                disabled={isGenerating}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>{isGenerating ? 'Generating...' : 'Generate Flyer Image'}</span>
              </button>
            )}

            <button
              id="modal-done-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-200 text-xs font-semibold border border-dark-700 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
