import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layer, ImageMetadata, LayerType, DeducedPalette, CanvasViewMode } from '../types';
import { Button } from './Button';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Layers, 
  Palette, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Download, 
  Move, 
  Sliders, 
  SplitSquareVertical, 
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  X,
  Smartphone,
  Compass
} from 'lucide-react';

interface CanvasEditorProps {
  imageMetadata: ImageMetadata;
  layers: Layer[];
  selectedLayerIds: string[];
  palette?: DeducedPalette;
  selectedColorHex?: string | null;
  onSelectLayer: (id: string | null, multi: boolean) => void;
  onGenerateLayer: (layerId: string, prompt: string) => void;
  onUpdatePrompt: (layerId: string, newPrompt: string) => void;
  onShufflePrompt: (layerId: string) => void;
  onDownloadLayer: (layer: Layer) => void;
  onLayerMove: (id: string, x: number, y: number) => void;
  onSelectColor?: (hex: string | null) => void;
  onToggleLayerPanel?: () => void;
  onTogglePalettePanel?: () => void;
  showPalettePanel?: boolean;
  showLayerPanel?: boolean;
  isShuffling?: string | null;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
  imageMetadata, 
  layers, 
  selectedLayerIds,
  palette,
  selectedColorHex,
  onSelectLayer,
  onGenerateLayer,
  onUpdatePrompt,
  onShufflePrompt,
  onDownloadLayer,
  onLayerMove,
  onSelectColor,
  onToggleLayerPanel,
  onTogglePalettePanel,
  showPalettePanel = false,
  showLayerPanel = false,
  isShuffling
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dragLayerStart, setDragLayerStart] = useState({ x: 0, y: 0 });
  const [layerInitialPos, setLayerInitialPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<CanvasViewMode>('layers');
  const [showGhostReference, setShowGhostReference] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [touchDistanceStart, setTouchDistanceStart] = useState<number | null>(null);
  const [touchScaleStart, setTouchScaleStart] = useState<number>(1);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'prompt' | 'canvas'>('prompt');

  const selectedLayers = layers.filter(l => selectedLayerIds.includes(l.id));
  const compositionLayer = layers.find(l => l.type === LayerType.COMPOSITION);
  const activePromptLayer = compositionLayer || selectedLayers[0] || layers[0];
  const currentPromptText = activePromptLayer?.visual_prompt || activePromptLayer?.name || '';

  // Ensure that in mobile view, whenever an image is analysed or loaded, the full remix prompt is surfaced first
  useEffect(() => {
    if (isMobile) {
      setMobileActiveTab('prompt');
    }
  }, [imageMetadata.src, isMobile]);

  // When user selects the composition layer on mobile, switch to the prompt tab
  useEffect(() => {
    if (isMobile && selectedLayers.some(l => l.type === LayerType.COMPOSITION)) {
      setMobileActiveTab('prompt');
    }
  }, [selectedLayerIds, isMobile]);

  // ResizeObserver for responsive canvas measurement
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
        const mobileCheck = width < 768;
        setIsMobile(mobileCheck);
        // Default view mode: mobile prefers full layers canvas, desktop can use split if wide enough
        if (mobileCheck && viewMode === 'split') {
          setViewMode('layers');
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [viewMode]);

  // Fit to screen helper
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const isSplit = viewMode === 'split' && clientWidth >= 768;
    const availableWidth = isSplit ? (clientWidth / 2) - 48 : clientWidth - 48;
    const availableHeight = clientHeight - 120;

    const fitScale = Math.min(
      availableWidth / imageMetadata.width,
      availableHeight / imageMetadata.height,
      1.1
    );

    setScale(Math.max(0.15, fitScale));
    setOffset({ x: 0, y: 0 });
  }, [imageMetadata, viewMode]);

  // Auto-fit on initial metadata or resize
  useEffect(() => {
    fitToScreen();
  }, [imageMetadata, fitToScreen]);

  const fallbackCopyTextToClipboard = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (e) {
      console.warn("Fallback copy failed:", e);
    }
  };

  const handleCopyPrompt = (text: string) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopyTextToClipboard(text);
      });
    } else {
      fallbackCopyTextToClipboard(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mouse drag handlers for canvas & layers
  const handleLayerMouseDown = (e: React.MouseEvent, layer: Layer) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectLayer(layer.id, e.shiftKey || e.metaKey || e.ctrlKey);
    setDraggingLayerId(layer.id);
    setDragLayerStart({ x: e.clientX, y: e.clientY });
    setLayerInitialPos({ x: layer.originalX, y: layer.originalY });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('#canvas-hud') || (e.target as HTMLElement).closest('#layer-inspector')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingLayerId) {
      const deltaX = (e.clientX - dragLayerStart.x) / scale;
      const deltaY = (e.clientY - dragLayerStart.y) / scale;
      onLayerMove(draggingLayerId, layerInitialPos.x + deltaX, layerInitialPos.y + deltaY);
    } else if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDraggingLayerId(null);
  };

  // Touch handlers for mobile devices
  const getTouchDistance = (e: React.TouchEvent): number => {
    if (e.touches.length < 2) return 0;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('#canvas-hud') || (e.target as HTMLElement).closest('#layer-inspector')) return;
    
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y
      });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = getTouchDistance(e);
      setTouchDistanceStart(dist);
      setTouchScaleStart(scale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && !draggingLayerId) {
      setOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && touchDistanceStart !== null) {
      const currentDist = getTouchDistance(e);
      if (currentDist > 0 && touchDistanceStart > 0) {
        const factor = currentDist / touchDistanceStart;
        const newScale = Math.max(0.1, Math.min(6, touchScaleStart * factor));
        setScale(newScale);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDraggingLayerId(null);
    setTouchDistanceStart(null);
  };

  // Layer touch selection on mobile
  const handleLayerTouchStart = (e: React.TouchEvent, layer: Layer) => {
    e.stopPropagation();
    onSelectLayer(layer.id, false);
    if (e.touches.length === 1) {
      setDraggingLayerId(layer.id);
      setDragLayerStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setLayerInitialPos({ x: layer.originalX, y: layer.originalY });
    }
  };

  // Zoom control steps
  const handleZoomIn = () => setScale(s => Math.min(6, s * 1.25));
  const handleZoomOut = () => setScale(s => Math.max(0.1, s / 1.25));

  // Determine panel positions based on view mode and container size
  const isSplitMode = viewMode === 'split' && (containerSize.width >= 768);
  const panelCenterX = containerSize.width > 0 ? containerSize.width * 0.5 : 0;
  const panelCenterY = containerSize.height > 0 ? containerSize.height * 0.5 : 0;

  // Split positions
  const leftPanelCenterX = isSplitMode ? containerSize.width * 0.25 : panelCenterX;
  const rightPanelCenterX = isSplitMode ? containerSize.width * 0.75 : panelCenterX;

  return (
    <div 
      ref={containerRef}
      id="canvas-editor-container"
      className="flex-1 w-full h-full relative flex flex-col bg-[#0d0f12] overflow-hidden select-none"
    >
      {/* Canvas Viewport */}
      <div 
        id="canvas-viewport"
          className={`flex-1 bg-[#0d0f12] overflow-hidden relative flex select-none touch-none ${
            draggingLayerId ? 'cursor-move' : (isDragging ? 'cursor-grabbing' : 'cursor-grab')
          }`}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setScale(s => Math.max(0.1, Math.min(8, s - e.deltaY * 0.0015)));
        } else {
          setOffset(prev => ({ x: prev.x - e.deltaX * 0.8, y: prev.y - e.deltaY * 0.8 }));
        }
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Studio Dot Grid Background */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* Split Divider line on wide screens */}
      {isSplitMode && (
        <div className="absolute top-0 bottom-0 w-px bg-white/10 left-1/2 z-0 pointer-events-none">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-dark-900 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400">
            SPLIT VIEW
          </div>
        </div>
      )}

      {/* Canvas Panels Rendering */}
      {/* 1. Left Panel (Reference Image in Split Mode OR in 'original' mode) */}
      {(isSplitMode || viewMode === 'original') && (
        <div 
          className="absolute w-0 h-0 flex items-center justify-center pointer-events-none" 
          style={{ 
            left: isSplitMode ? leftPanelCenterX : panelCenterX, 
            top: panelCenterY 
          }}
        >
          <div 
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, 
              width: imageMetadata.width, 
              height: imageMetadata.height, 
              position: 'absolute', 
              left: -imageMetadata.width / 2, 
              top: -imageMetadata.height / 2 
            }}
          >
            <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-black/40">
              <img 
                src={imageMetadata.src} 
                alt="Original Reference" 
                className="w-full h-full object-contain pointer-events-none" 
                draggable={false} 
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-gray-300">
                Original Reference
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Right Panel (Deconstructed Interactive Layers) */}
      {(isSplitMode || viewMode === 'layers' || viewMode === 'compare') && (
        <div 
          className="absolute w-0 h-0 flex items-center justify-center" 
          style={{ 
            left: isSplitMode ? rightPanelCenterX : panelCenterX, 
            top: panelCenterY 
          }}
        >
          <div 
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, 
              width: imageMetadata.width, 
              height: imageMetadata.height, 
              position: 'absolute', 
              left: -imageMetadata.width / 2, 
              top: -imageMetadata.height / 2 
            }}
          >
            {/* Optional Ghost Backdrop for Alignment */}
            {(showGhostReference || viewMode === 'compare') && (
              <img 
                src={imageMetadata.src} 
                alt="Ghost Reference" 
                className="absolute inset-0 w-full h-full object-contain opacity-35 pointer-events-none filter grayscale brightness-75" 
                draggable={false} 
              />
            )}

            {/* Individual Layer Cutouts */}
            {layers.map(layer => {
              if (!layer.isVisible || layer.type === LayerType.COMPOSITION) return null;
              
              const isSelected = selectedLayerIds.includes(layer.id);
              const matchesColor = selectedColorHex && layer.color_palette?.some(
                hex => hex.toLowerCase() === selectedColorHex.toLowerCase()
              );

              return (
                <div 
                  key={layer.id} 
                  id={`canvas-layer-${layer.id}`}
                  className="absolute group transition-transform" 
                  style={{ 
                    left: layer.originalX, 
                    top: layer.originalY, 
                    width: layer.width, 
                    height: layer.height, 
                    zIndex: isSelected ? 50 : (matchesColor ? 40 : 10), 
                    cursor: 'move' 
                  }} 
                  onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                  onTouchStart={(e) => handleLayerTouchStart(e, layer)}
                >
                  {/* Selection & Color Highlight Outlines */}
                  <div 
                    className={`absolute -inset-1 rounded-sm border-2 pointer-events-none transition-all duration-200 ${
                      isSelected 
                        ? 'border-brand-500 bg-brand-500/15 shadow-[0_0_15px_rgba(14,165,233,0.5)]' 
                        : (matchesColor 
                            ? 'border-amber-400 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-pulse' 
                            : 'border-transparent group-hover:border-brand-500/40')
                    }`} 
                  />

                  {/* Layer Label on Hover / Select */}
                  <div className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide whitespace-nowrap pointer-events-none backdrop-blur-md transition-opacity ${
                    isSelected 
                      ? 'bg-brand-500 text-white opacity-100' 
                      : 'bg-black/70 text-gray-300 opacity-0 group-hover:opacity-100'
                  }`}>
                    {layer.name}
                  </div>

                  <img 
                    src={layer.imageSrc} 
                    alt={layer.name}
                    className={`w-full h-full object-contain pointer-events-none ${
                      layer.isGenerating ? 'opacity-50 animate-pulse' : ''
                    }`} 
                    draggable={false} 
                  />
                </div>
              );
            })}

            {/* Master Composition Handle on Canvas */}
            {compositionLayer && (
              <div 
                id="composition-handle-btn"
                className="absolute -top-10 left-0 z-50 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-950/90 hover:bg-brand-950 border border-brand-500/40 shadow-[0_0_15px_rgba(14,165,233,0.3)] cursor-pointer backdrop-blur-md transition-all active:scale-95 group"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onSelectLayer(compositionLayer.id, false);
                  if (isMobile) setMobileActiveTab('prompt');
                }}
                title="Master Remix Prompt: Select full composition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
                <span className="text-[11px] font-bold text-brand-300 tracking-wide">Full Remix Prompt</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Canvas Controls HUD */}
      <div 
        id="canvas-hud"
        className="absolute top-4 left-4 z-40 flex flex-wrap items-center gap-1.5 bg-dark-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-xl max-w-[calc(100vw-32px)]"
      >

        {/* View Mode Switcher */}
        <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5">
          <button
            id="view-mode-layers-btn"
            onClick={() => setViewMode('layers')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-all ${
              viewMode === 'layers' 
                ? 'bg-brand-500 text-white shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
            title="Deconstructed Layers Only"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Layers</span>
          </button>

          {!isMobile && (
            <button
              id="view-mode-split-btn"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-all ${
                viewMode === 'split' 
                  ? 'bg-brand-500 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Side-by-Side Reference & Layers"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
          )}

          <button
            id="view-mode-original-btn"
            onClick={() => setViewMode('original')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-all ${
              viewMode === 'original' 
                ? 'bg-brand-500 text-white shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
            title="Original Reference Image"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Original</span>
          </button>
        </div>

        <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block"></div>

        {/* Ghost Reference Toggle (in Layers mode) */}
        {viewMode === 'layers' && (
          <button
            id="toggle-ghost-btn"
            onClick={() => setShowGhostReference(!showGhostReference)}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all border ${
              showGhostReference 
                ? 'bg-brand-500/20 border-brand-500/40 text-brand-300' 
                : 'bg-white/5 border-transparent text-gray-400 hover:text-white'
            }`}
            title={showGhostReference ? "Hide Reference Overlay" : "Show Reference Overlay"}
          >
            {showGhostReference ? <Eye className="w-3.5 h-3.5 text-brand-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Ghost Ref</span>
          </button>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center space-x-0.5 bg-black/40 rounded-lg p-0.5 border border-white/5">
          <button
            id="zoom-out-btn"
            onClick={handleZoomOut}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span 
            className="text-[11px] font-mono text-gray-300 px-1.5 min-w-[40px] text-center cursor-pointer hover:text-white"
            onClick={fitToScreen}
            title="Click to Reset View"
          >
            {Math.round(scale * 100)}%
          </span>

          <button
            id="zoom-in-btn"
            onClick={handleZoomIn}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            id="fit-screen-btn"
            onClick={fitToScreen}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Fit to Screen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>


      </div>

    </div>
  </div>
);
};
