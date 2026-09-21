import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DeducedPalette, PaletteColor, Layer } from '../types';
import { exportPaletteCSS, exportPaletteTailwind, exportPaletteJSON } from '../utils/colorExtractor';
import { 
  Palette, 
  Copy, 
  Check, 
  Sparkles, 
  Code2, 
  X, 
  Layers,
  Info,
  Sliders,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface ColorPaletteSectionProps {
  palette: DeducedPalette;
  layers?: Layer[];
  selectedColorHex: string | null;
  onSelectColor: (hex: string | null) => void;
  onApplyColorToPrompt?: (hex: string, colorName: string) => void;
  onHighlightLayersWithColor?: (layerIds: string[]) => void;
  onRededucePalette?: () => void;
  isRededucing?: boolean;
  onClose?: () => void;
  className?: string;
}

export const ColorPaletteSection: React.FC<ColorPaletteSectionProps> = ({
  palette,
  layers = [],
  selectedColorHex,
  onSelectColor,
  onApplyColorToPrompt,
  onHighlightLayersWithColor,
  onRededucePalette,
  isRededucing = false,
  onClose,
  className = ''
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'css' | 'tailwind' | 'json' | 'hexList'>('css');
  const [viewTab, setViewTab] = useState<'list' | 'swatches'>('list');

  // Clean hex without # for the capsule display
  const formatHexNoHash = (hex: string) => {
    return hex.replace(/^#/, '').toUpperCase();
  };

  const selectedColor = palette.colors.find(c => c.hex.toLowerCase() === selectedColorHex?.toLowerCase()) || null;

  const handleCopyHex = (hex: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const handleColorClick = (color: PaletteColor) => {
    if (selectedColorHex?.toLowerCase() === color.hex.toLowerCase()) {
      onSelectColor(null);
    } else {
      onSelectColor(color.hex);
      if (color.matchedLayerIds && color.matchedLayerIds.length > 0 && onHighlightLayersWithColor) {
        onHighlightLayersWithColor(color.matchedLayerIds);
      }
    }
  };

  const handleCopyExport = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getExportContent = () => {
    switch (exportFormat) {
      case 'css': return exportPaletteCSS(palette);
      case 'tailwind': return exportPaletteTailwind(palette);
      case 'json': return exportPaletteJSON(palette);
      case 'hexList': return palette.colors.map(c => `${c.hex} - ${c.name} (${c.role})`).join('\n');
    }
  };

  return (
    <div id="color-palette-sidebar" className={`w-full h-full flex flex-col bg-dark-900 select-none overflow-hidden ${className}`}>
      {/* 1. SIDEBAR HEADER */}
      <div className="p-3.5 sm:p-4 border-b border-dark-800 flex items-center justify-between shrink-0 bg-dark-950/40">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 via-amber-500 to-yellow-400 flex items-center justify-center shadow-md shrink-0">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
              {palette.themeName || "Color Palette"}
            </h2>
            <div className="flex items-center space-x-1.5 mt-0.5">
              {palette.harmony && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {palette.harmony}
                </span>
              )}
              <span className="text-[10px] text-gray-400 font-mono">
                {palette.colors.length} Colors
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {onRededucePalette && (
            <button
              id="rededuce-palette-sidebar-btn"
              onClick={onRededucePalette}
              disabled={isRededucing}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs flex items-center disabled:opacity-50"
              title="Re-deduce palette with AI"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRededucing ? 'animate-spin text-brand-400' : 'text-amber-400'}`} />
            </button>
          )}

          <button
            id="export-palette-sidebar-btn"
            onClick={() => setShowExportModal(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs flex items-center"
            title="Export Color Palette (CSS, Tailwind, JSON)"
          >
            <Code2 className="w-3.5 h-3.5 text-brand-400" />
          </button>

          {onClose && (
            <button
              id="close-palette-sidebar-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              title="Hide Color Palette Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. CAPSULE SWATCH ROW (Iconic Pill Aesthetic) */}
      <div className="p-3 sm:p-4 border-b border-dark-800 bg-black/20 shrink-0">
        <div 
          id="sidebar-palette-pill"
          className="relative flex items-center justify-center rounded-2xl bg-[#1e1e24]/80 backdrop-blur-md border border-white/[0.12] p-2.5 sm:p-3 shadow-inner overflow-hidden"
        >
          {/* Overlapping Color Circles Row */}
          <div className="relative z-10 flex items-center justify-center -space-x-2 sm:-space-x-2.5 py-1">
            {palette.colors.map((color, index) => {
              const isSelected = selectedColorHex?.toLowerCase() === color.hex.toLowerCase();
              const isCopied = copiedHex?.toLowerCase() === color.hex.toLowerCase();

              return (
                <motion.button
                  key={color.hex + index}
                  whileHover={{ scale: 1.15, y: -2, zIndex: 30 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleColorClick(color)}
                  style={{ 
                    backgroundColor: color.hex,
                    zIndex: isSelected ? 25 : 10 + index
                  }}
                  className={`relative rounded-full transition-all duration-200 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 shadow-md ${
                    isSelected 
                      ? 'ring-2 ring-white ring-offset-1 ring-offset-black/80 scale-110 shadow-lg' 
                      : 'border border-black/20 hover:shadow-xl'
                  }`}
                  title={`${color.name} (${color.hex})`}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-black/25 pointer-events-none" />
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
                  ) : isSelected ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs animate-pulse" />
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Color Spectrum Distribution Bar */}
        <div className="mt-2.5 flex rounded-full h-1.5 overflow-hidden ring-1 ring-white/10">
          {palette.colors.map((color, index) => (
            <div
              key={color.hex + index}
              className="flex-1 transition-all hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: color.hex }}
              onClick={() => handleColorClick(color)}
              title={`${color.name} - ${color.hex}`}
            />
          ))}
        </div>
      </div>

      {/* 3. SELECTED COLOR ACTION DRAWER (when tapped) */}
      <AnimatePresence>
        {selectedColor && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-brand-500/30 bg-brand-950/20 backdrop-blur-xs p-3 shrink-0 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div 
                  className="w-7 h-7 rounded-lg border border-white/30 shadow-md shrink-0"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs font-bold text-white">{selectedColor.hex}</span>
                    <span className="text-[11px] text-brand-300 font-medium truncate">{selectedColor.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {selectedColor.role}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectColor(null)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <button
                onClick={(e) => handleCopyHex(selectedColor.hex, e)}
                className="flex-1 py-1 px-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-gray-200 hover:text-white flex items-center justify-center space-x-1 transition-all"
              >
                {copiedHex === selectedColor.hex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                <span>{copiedHex === selectedColor.hex ? "Copied" : "Copy HEX"}</span>
              </button>

              {onApplyColorToPrompt && (
                <button
                  onClick={() => onApplyColorToPrompt(selectedColor.hex, selectedColor.name)}
                  className="flex-1 py-1 px-2 rounded-md bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-[11px] text-brand-300 hover:text-brand-200 flex items-center justify-center space-x-1 transition-all font-medium"
                >
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  <span>Use in Prompt</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. SCROLLABLE COLOR CARDS LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          <span>Palette Swatches</span>
          <span>Role / RGB</span>
        </div>

        {palette.colors.map((color, index) => {
          const isSelected = selectedColorHex?.toLowerCase() === color.hex.toLowerCase();
          const isCopied = copiedHex?.toLowerCase() === color.hex.toLowerCase();
          const matchedCount = color.matchedLayerIds ? color.matchedLayerIds.length : 0;

          return (
            <div
              key={color.hex + index}
              onClick={() => handleColorClick(color)}
              className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-brand-500/10 border-brand-500/40 shadow-sm' 
                  : 'bg-dark-950/60 border-dark-800 hover:border-dark-700 hover:bg-dark-950/90'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  {/* Swatch circle */}
                  <div 
                    className="relative w-8 h-8 rounded-lg shadow-sm border border-white/20 shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: color.hex }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/25 pointer-events-none" />
                    {isCopied && <Check className="w-4 h-4 text-emerald-300 drop-shadow" />}
                  </div>

                  {/* Name & Hex */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-white">{color.hex}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[11px] text-gray-300 font-medium truncate max-w-[130px]">
                      {color.name}
                    </div>
                  </div>
                </div>

                {/* Role badge & copy action */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] text-gray-400 font-mono">
                    {color.role}
                  </span>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <button
                      onClick={(e) => handleCopyHex(color.hex, e)}
                      className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                      title="Copy HEX"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {matchedCount > 0 && onHighlightLayersWithColor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onHighlightLayersWithColor(color.matchedLayerIds || []);
                        }}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                        title={`Select ${matchedCount} layers with this color`}
                      >
                        {matchedCount} {matchedCount === 1 ? 'Layer' : 'Layers'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded details if selected */}
              {isSelected && (
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>RGB({color.rgb.r}, {color.rgb.g}, {color.rgb.b})</span>
                  {onApplyColorToPrompt && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyColorToPrompt(color.hex, color.name);
                      }}
                      className="text-brand-300 hover:text-brand-200 font-semibold flex items-center space-x-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Apply to Prompt</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. SIDEBAR BOTTOM FOOTER */}
      <div className="p-3 border-t border-dark-800 bg-dark-950/60 shrink-0 flex items-center justify-between gap-2">
        <button
          onClick={() => setShowExportModal(true)}
          className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 hover:text-white flex items-center justify-center space-x-1.5 transition-all"
        >
          <Code2 className="w-3.5 h-3.5 text-brand-400" />
          <span>Export Palette</span>
        </button>

        {onRededucePalette && (
          <button
            onClick={onRededucePalette}
            disabled={isRededucing}
            className="py-2 px-3 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-xs font-semibold text-brand-300 hover:text-brand-200 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
            title="Re-analyze with AI"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isRededucing ? 'animate-spin' : ''}`} />
            <span>AI Re-deduce</span>
          </button>
        )}
      </div>

      {/* 6. EXPORT MODAL */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-5 h-5 text-brand-400" />
                  <h3 className="text-base font-bold text-white">Export Color Palette</h3>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Format Tabs */}
              <div className="flex border-b border-white/10 bg-black/20 px-5 pt-3 space-x-2">
                {[
                  { id: 'css', label: 'CSS Variables' },
                  { id: 'tailwind', label: 'Tailwind Config' },
                  { id: 'json', label: 'JSON' },
                  { id: 'hexList', label: 'HEX List' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setExportFormat(tab.id as any)}
                    className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                      exportFormat === tab.id
                        ? 'border-brand-500 text-brand-400 bg-white/5'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Code preview area */}
              <div className="p-5 flex-1 overflow-hidden flex flex-col">
                <div className="relative flex-1">
                  <pre className="w-full h-48 bg-black/60 border border-white/10 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto select-all leading-relaxed">
                    {getExportContent()}
                  </pre>
                </div>

                <div className="flex items-center justify-between pt-4 mt-2">
                  <span className="text-xs text-gray-500">
                    {palette.colors.length} color swatches
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCopyExport(getExportContent(), 'export')}
                      className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-brand-500/25"
                    >
                      {copiedType === 'export' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedType === 'export' ? "Copied Code" : "Copy to Clipboard"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
