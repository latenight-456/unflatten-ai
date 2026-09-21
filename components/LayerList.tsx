
import React, { useState } from 'react';
import { Layer, LayerType, ImageMetadata, DeducedPalette } from '../types';
import { Button } from './Button';
import { LayerJsonViewer } from './LayerJsonViewer';
import { Code, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { createLayerJsonBreakdown } from '../utils/layerJson';

interface LayerListProps {
  layers: Layer[];
  selectedLayerIds: string[];
  onSelectLayer: (id: string, multi: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onDownloadLayer: (layer: Layer) => void;
  onClose?: () => void;
  activeTab: 'layers' | 'json' | 'generated';
  onTabChange: (tab: 'layers' | 'json' | 'generated') => void;
  onMergeAndGenerate: () => void;
  isMerging: boolean;
  onReanalyzeLayer?: (id: string) => void;
  imageMetadata?: ImageMetadata | null;
  palette?: DeducedPalette | null;
}

const LayerIcon = ({ type }: { type: LayerType }) => {
  switch (type) {
    case LayerType.BACKGROUND:
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case LayerType.TEXT:
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case LayerType.GENERATED:
      return (
        <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
  }
};

export const LayerList: React.FC<LayerListProps> = ({ 
  layers, 
  selectedLayerIds, 
  onSelectLayer, 
  onToggleVisibility,
  onDownloadLayer,
  onClose,
  activeTab,
  onTabChange,
  onMergeAndGenerate,
  isMerging,
  onReanalyzeLayer,
  imageMetadata,
  palette
}) => {
  const [expandedJsonLayerId, setExpandedJsonLayerId] = useState<string | null>(null);
  const [copiedLayerId, setCopiedLayerId] = useState<string | null>(null);

  const displayedLayers = layers.filter(l => {
    if (activeTab === 'generated') {
      return l.type === LayerType.GENERATED;
    } else {
      return l.type !== LayerType.GENERATED && l.type !== LayerType.COMPOSITION;
    }
  });

  const compositionLayer = layers.find(l => l.type === LayerType.COMPOSITION);
  const regularLayersCount = layers.filter(l => l.type !== LayerType.GENERATED && l.type !== LayerType.COMPOSITION).length;
  const generatedLayersCount = layers.filter(l => l.type === LayerType.GENERATED).length;

  const handleCopyLayerJson = async (layer: Layer, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const breakdown = layer.json_breakdown || createLayerJsonBreakdown(
      {
        label: layer.name,
        category: layer.type,
        box_2d: [layer.box.ymin, layer.box.xmin, layer.box.ymax, layer.box.xmax],
        visual_prompt: layer.visual_prompt || `Asset for ${layer.name}`,
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

    try {
      await navigator.clipboard.writeText(JSON.stringify(breakdown, null, 2));
      setCopiedLayerId(layer.id);
      setTimeout(() => setCopiedLayerId(null), 2000);
    } catch (err) {
      console.error("Failed to copy layer JSON:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-900 w-full overflow-hidden">
      {/* Sub-Tabs: Layers / JSON Breakdown / Generated */}
      <div className="flex border-b border-dark-800 bg-[#0f1117] shrink-0">
        <button 
          className={`flex-1 py-2.5 px-2 text-[11px] font-semibold text-center transition-colors cursor-pointer ${
            activeTab === 'layers' 
              ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' 
              : 'text-gray-400 hover:text-gray-200'
          }`} 
          onClick={() => onTabChange('layers')}
        >
          Layers ({regularLayersCount})
        </button>
        <button 
          className={`flex-1 py-2.5 px-2 text-[11px] font-semibold text-center transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'json' 
              ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' 
              : 'text-gray-400 hover:text-gray-200'
          }`} 
          onClick={() => onTabChange('json')}
          title="Inspect JSON breakdown for all layers"
        >
          <Code className="w-3 h-3" />
          <span>JSON</span>
        </button>
        <button 
          className={`flex-1 py-2.5 px-2 text-[11px] font-semibold text-center transition-colors cursor-pointer ${
            activeTab === 'generated' 
              ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' 
              : 'text-gray-400 hover:text-gray-200'
          }`} 
          onClick={() => onTabChange('generated')}
        >
          Generated {generatedLayersCount > 0 && `(${generatedLayersCount})`}
        </button>
      </div>

      {/* 1. JSON BREAKDOWN TAB */}
      {activeTab === 'json' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <LayerJsonViewer
            layers={layers}
            selectedLayerIds={selectedLayerIds}
            imageMetadata={imageMetadata || null}
            palette={palette || null}
            onSelectLayer={onSelectLayer}
          />
        </div>
      )}

      {/* 2. LAYERS & GENERATED TABS */}
      {activeTab !== 'json' && (
        <>
          {activeTab === 'layers' && (
            <div className="p-2 border-b border-dark-800 space-y-2 shrink-0 bg-[#0d0f14]">
              {compositionLayer && (
                <button 
                  onClick={() => onSelectLayer(compositionLayer.id, false)} 
                  className={`w-full py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    selectedLayerIds.includes(compositionLayer.id) 
                      ? 'bg-brand-600 text-white shadow-lg' 
                      : 'bg-brand-900/20 border border-brand-500/20 text-brand-300 hover:bg-brand-900/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-xs font-medium">Full Remix Master Prompt</span>
                </button>
              )}
              {selectedLayerIds.length >= 2 && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs" 
                  onClick={onMergeAndGenerate} 
                  disabled={isMerging}
                >
                  {isMerging ? "Merging..." : `Group & Generate (${selectedLayerIds.length})`}
                </Button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-0">
            {displayedLayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-center p-4">
                <p className="text-xs">No layers found.</p>
              </div>
            ) : (
              displayedLayers.map((layer, idx) => {
                const isSelected = selectedLayerIds.includes(layer.id);
                const isJsonExpanded = expandedJsonLayerId === layer.id;

                const layerBreakdown = layer.json_breakdown || createLayerJsonBreakdown(
                  {
                    label: layer.name,
                    category: layer.type,
                    box_2d: [layer.box.ymin, layer.box.xmin, layer.box.ymax, layer.box.xmax],
                    visual_prompt: layer.visual_prompt || `Asset for ${layer.name}`,
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

                return (
                  <div 
                    key={layer.id}
                    className={`rounded-lg transition-all border overflow-hidden ${
                      isSelected 
                        ? 'bg-brand-900/30 border-brand-500/40 shadow-xs' 
                        : 'bg-[#10131a] hover:bg-[#151922] border-dark-800'
                    }`}
                  >
                    {/* Main Row */}
                    <div 
                      onClick={(e) => onSelectLayer(layer.id, e.shiftKey || e.metaKey || e.ctrlKey)}
                      className="group flex items-center p-2 cursor-pointer"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }} 
                        className="p-1 rounded text-gray-400 hover:text-white mr-1.5 shrink-0 transition-colors"
                        title={layer.isVisible ? "Hide Layer" : "Show Layer"}
                      >
                        {layer.isVisible ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>

                      <div className="w-9 h-9 bg-dark-800 rounded border border-dark-700 mr-2.5 overflow-hidden checkerboard shrink-0 relative">
                        {isSelected && (
                          <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <img src={layer.imageSrc} alt={layer.name} className="w-full h-full object-contain" />
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center space-x-1.5">
                          <p className={`text-xs truncate ${isSelected ? 'text-brand-100 font-semibold' : 'text-gray-200'}`}>
                            {layer.name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5 mt-0.5">
                          <LayerIcon type={layer.type} />
                          <span className="text-[10px] text-gray-400 capitalize">{layer.type}</span>
                          {layer.ocr_text && (
                            <span className="text-[9px] font-mono bg-brand-950/60 text-brand-300 border border-brand-500/30 px-1 rounded truncate max-w-[80px]" title={`OCR: ${layer.ocr_text}`}>
                              "{layer.ocr_text}"
                            </span>
                          )}
                          {layer.color_palette && layer.color_palette.length > 0 && (
                            <div className="flex items-center space-x-0.5">
                              {layer.color_palette.map((hex, pIdx) => (
                                <span key={pIdx} className="w-2 h-2 rounded-full border border-black/50 inline-block" style={{ backgroundColor: hex }} title={hex} />
                              ))}
                            </div>
                          )}
                          {layer.confidence && (
                            <span className="text-[9px] text-emerald-400 font-mono ml-auto">
                              {Math.round(layer.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions: JSON toggle & Re-analyze */}
                      <div className="flex items-center space-x-0.5 shrink-0 ml-1">
                        {/* Inline JSON breakdown button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedJsonLayerId(isJsonExpanded ? null : layer.id);
                          }}
                          className={`p-1 rounded text-xs font-mono transition-all cursor-pointer ${
                            isJsonExpanded 
                              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' 
                              : 'text-gray-500 hover:text-brand-400 hover:bg-dark-700'
                          }`}
                          title={isJsonExpanded ? "Collapse JSON" : "Inspect Layer JSON Breakdown"}
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>

                        {onReanalyzeLayer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReanalyzeLayer(layer.id);
                            }}
                            className={`p-1 rounded text-gray-500 hover:text-brand-400 hover:bg-dark-700 transition-all shrink-0 cursor-pointer ${
                              layer.isAnalyzing ? 'opacity-100 text-brand-400' : ''
                            }`}
                            title="AI Re-analyze Layer"
                            disabled={layer.isAnalyzing}
                          >
                            {layer.isAnalyzing ? (
                              <svg className="w-3.5 h-3.5 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Per-Layer JSON Breakdown */}
                    {isJsonExpanded && (
                      <div className="px-2.5 pb-2.5 pt-1 bg-[#090b0e] border-t border-dark-800/80 text-[10px] font-mono">
                        <div className="flex items-center justify-between py-1 mb-1 border-b border-dark-800 text-gray-400">
                          <div className="flex items-center space-x-1">
                            <span className="text-[9px] uppercase font-bold text-brand-400 tracking-wider">JSON Breakdown</span>
                            <span className="text-[9px] text-gray-500">({layer.type})</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleCopyLayerJson(layer, idx, e)}
                            className="px-1.5 py-0.5 rounded bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white flex items-center space-x-1 text-[10px] transition-colors cursor-pointer"
                            title="Copy Layer JSON"
                          >
                            {copiedLayerId === layer.id ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                <span className="text-emerald-400 text-[9px]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span className="text-[9px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="text-gray-300 whitespace-pre-wrap break-all leading-snug max-h-48 overflow-y-auto custom-scrollbar p-1.5 bg-[#050608] rounded border border-dark-800 selection:bg-brand-500/30 select-text">
                          {JSON.stringify(layerBreakdown, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
