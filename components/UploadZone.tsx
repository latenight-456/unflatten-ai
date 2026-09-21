import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from './Button';
import { UploadCloud, Clipboard, Check, Image as ImageIcon, Sparkles, Zap, Layers } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
      e.target.value = ''; // Reset input so same file can be selected again if needed
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Handle global paste event (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              onFileSelect(file);
              return;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onFileSelect]);

  // Handle explicit Paste button click
  const handlePasteClick = async () => {
    try {
      setShowPasteFallback(false);
      
      // Check if API exists
      if (!navigator.clipboard || !navigator.clipboard.read) {
        throw new Error("Clipboard API not supported");
      }

      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        // Find image type
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "pasted-image.png", { type: imageType });
          onFileSelect(file);
          return;
        }
      }
      
      // If we got here, we accessed clipboard but found no image
      alert("No image found in clipboard.");
      
    } catch (err) {
      // Browser blocked access (Permissions Policy) or API not supported
      setShowPasteFallback(true);
      setTimeout(() => setShowPasteFallback(false), 4000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-1 sm:px-4 py-2 sm:py-4 w-full">
      <div 
        className={`
          w-full min-h-[290px] sm:min-h-[340px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-5 sm:p-8
          transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-sm
          ${isDragging 
            ? 'border-[#0975C6] bg-blue-50/70 scale-[1.01]' 
            : 'border-slate-300 hover:border-[#0975C6]/60 hover:bg-white'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center space-y-3 sm:space-y-4 max-w-md mx-auto w-full">
          {/* Animated Cloud Icon */}
          <div className="w-14 h-14 sm:w-18 sm:h-18 bg-blue-50 text-[#0975C6] rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-blue-100">
            <UploadCloud className="w-7 h-7 sm:w-9 sm:h-9 text-[#0975C6] animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          
          <div>
            <h3 className="text-lg sm:text-2xl font-black text-[#0F172A] tracking-tight">
              Upload your flat image
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Drag & drop PNG, JPG, or WEBP, or paste from clipboard
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 justify-center relative w-full sm:w-auto">
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleInputChange}
            />

            {/* High Impact Select Button */}
            <button 
              id="upload-select-file-btn"
              onClick={handleButtonClick}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#D4FF32] hover:bg-[#c2f01f] text-black font-bold text-sm tracking-tight transition-all duration-200 shadow-lg shadow-black/10 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Select File</span>
            </button>
            
            {/* Paste Button */}
            <div className="relative w-full sm:w-auto">
              <button
                id="upload-paste-file-btn"
                onClick={handlePasteClick}
                className="w-full sm:w-auto px-5 py-3 rounded-full bg-[#111111] hover:bg-black text-white font-semibold text-sm tracking-tight transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                title="Paste image from clipboard"
              >
                <Clipboard className="w-4 h-4" />
                <span>Paste Image</span>
              </button>

              {/* Fallback Error Message */}
              {showPasteFallback && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 z-50">
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl shadow-xl backdrop-blur-md text-center">
                    <p className="font-bold mb-0.5">Clipboard permission required</p>
                    <p className="opacity-90">Press <kbd className="bg-red-200/60 px-1 py-0.5 rounded font-mono text-[10px]">Ctrl+V</kbd> to paste directly.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 3 Value Pillars */}
      <div className="mt-5 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4 text-center w-full max-w-xl">
        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-[#0975C6] flex items-center justify-center mx-auto mb-1 font-bold text-xs">1</div>
          <h4 className="text-[11px] sm:text-xs font-bold text-slate-900">Upload</h4>
          <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5">Up to 4K resolution</p>
        </div>
        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#D4FF32]/40 text-black flex items-center justify-center mx-auto mb-1 font-bold text-xs">2</div>
          <h4 className="text-[11px] sm:text-xs font-bold text-slate-900">Analyze</h4>
          <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5">Zero-shot layers</p>
        </div>
        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1 font-bold text-xs">3</div>
          <h4 className="text-[11px] sm:text-xs font-bold text-slate-900">Unflatten</h4>
          <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5">Prompt layers & PSD</p>
        </div>
      </div>
    </div>
  );
};
