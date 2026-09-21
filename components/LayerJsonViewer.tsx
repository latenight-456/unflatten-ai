import React, { useState, useMemo } from 'react';
import { Layer, LayerType, ImageMetadata, DeducedPalette, LayerJsonBreakdown } from '../types';
import { createFullAnalysisJson, createLayerJsonBreakdown } from '../utils/layerJson';
import { Copy, Check, Download, Code, Layers, FileCode, CheckCircle2 } from 'lucide-react';

interface LayerJsonViewerProps {
  layers: Layer[];
  selectedLayerIds: string[];
  imageMetadata: ImageMetadata | null;
  palette: DeducedPalette | null;
  onSelectLayer?: (id: string, multi: boolean) => void;
}

export const LayerJsonViewer: React.FC<LayerJsonViewerProps> = ({
  layers,
  selectedLayerIds,
  imageMetadata,
  palette,
  onSelectLayer
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedActive, setCopiedActive] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter out the full composition background if needed, or include all
  const visibleLayers = useMemo(() => {
    return layers.filter(l => l.type !== LayerType.COMPOSITION);
  }, [layers]);

  // Full analysis JSON object
  const fullAnalysis = useMemo(() => {
    return createFullAnalysisJson(imageMetadata, palette, layers);
  }, [imageMetadata, palette, layers]);

  // Active layer JSON object if a specific layer is selected
  const activeLayer = useMemo(() => {
    if (selectedViewId === 'all') return null;
    return layers.find(l => l.id === selectedViewId);
  }, [layers, selectedViewId]);

  const activeLayerBreakdown = useMemo(() => {
    if (!activeLayer) return null;
    if (activeLayer.json_breakdown) return activeLayer.json_breakdown;

    const idx = visibleLayers.findIndex(l => l.id === activeLayer.id);
    return createLayerJsonBreakdown(
      {
        label: activeLayer.name,
        category: activeLayer.type,
        box_2d: [activeLayer.box.ymin, activeLayer.box.xmin, activeLayer.box.ymax, activeLayer.box.xmax],
        visual_prompt: activeLayer.visual_prompt || `Asset for ${activeLayer.name}`,
        color_palette: activeLayer.color_palette,
        ocr_text: activeLayer.ocr_text,
        confidence: activeLayer.confidence,
        semantic_role: activeLayer.semantic_role,
        depth: activeLayer.depth,
        z_index: activeLayer.z_index,
        attributes: activeLayer.attributes
      },
      {
        x: activeLayer.originalX,
        y: activeLayer.originalY,
        width: activeLayer.width,
        height: activeLayer.height
      },
      Math.max(0, idx),
      activeLayer.id
    );
  }, [activeLayer, visibleLayers]);

  // JSON string to display
  const jsonString = useMemo(() => {
    if (selectedViewId === 'all') {
      return JSON.stringify(fullAnalysis, null, 2);
    }
    return JSON.stringify(activeLayerBreakdown, null, 2);
  }, [selectedViewId, fullAnalysis, activeLayerBreakdown]);

  const handleCopy = async (text: string, isAll: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isAll) {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      } else {
        setCopiedActive(true);
        setTimeout(() => setCopiedActive(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedViewId === 'all' 
      ? `layers_breakdown_analysis.json` 
      : `${(activeLayer?.name || 'layer').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_breakdown.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0e12] text-gray-200 overflow-hidden select-text">
      {/* Top Header Controls */}
      <div className="p-3 border-b border-dark-800 bg-[#10131a] flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Code className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-200">Layer JSON Breakdown</h3>
              <p className="text-[10px] text-gray-400">
                {visibleLayers.length} layers decomposed with bounding & neural metadata
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleCopy(jsonString, selectedViewId === 'all')}
              className="px-2 py-1 rounded bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-gray-600 text-gray-300 text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer"
              title="Copy JSON to Clipboard"
            >
              {copiedAll || copiedActive ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-gray-600 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Download JSON File"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Layer Scope Selector */}
        <div className="flex items-center space-x-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Scope:</span>
          <select
            value={selectedViewId}
            onChange={(e) => {
              setSelectedViewId(e.target.value);
              if (e.target.value !== 'all' && onSelectLayer) {
                onSelectLayer(e.target.value, false);
              }
            }}
            className="flex-1 bg-[#090b0e] border border-dark-700 rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-brand-500/50 cursor-pointer"
          >
            <option value="all">Full Analysis (All {visibleLayers.length} Layers)</option>
            {visibleLayers.map((l, i) => (
              <option key={l.id} value={l.id}>
                Layer {i + 1}: {l.name} ({l.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layer Highlights Badges (if single layer selected) */}
      {activeLayerBreakdown && (
        <div className="px-3 py-2 bg-[#090b0e] border-b border-dark-800/80 flex flex-wrap gap-1.5 items-center shrink-0">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-brand-500/15 border border-brand-500/30 text-brand-300">
            {activeLayerBreakdown.category}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-800 text-gray-300 border border-dark-700">
            {activeLayerBreakdown.semantic_role || activeLayerBreakdown.depth}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-800 text-emerald-400 border border-dark-700">
            {Math.round(activeLayerBreakdown.confidence * 100)}% conf
          </span>
          {activeLayerBreakdown.geometry_pixels && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-800 text-gray-400 border border-dark-700">
              {activeLayerBreakdown.geometry_pixels.width}×{activeLayerBreakdown.geometry_pixels.height}px
            </span>
          )}
        </div>
      )}

      {/* Formatted Code Viewer */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed custom-scrollbar bg-[#080a0e]">
        <pre className="text-gray-300 whitespace-pre-wrap break-all font-mono selection:bg-brand-500/30">
          {jsonString}
        </pre>
      </div>

      {/* Footer Info Bar */}
      <div className="px-3 py-1.5 border-t border-dark-800 bg-[#0d0f14] flex items-center justify-between text-[10px] text-gray-500 font-mono shrink-0">
        <span>{selectedViewId === 'all' ? `Entire Analysis JSON` : `Single Layer Breakdown`}</span>
        <span>{(new Blob([jsonString]).size / 1024).toFixed(1)} KB</span>
      </div>
    </div>
  );
};
