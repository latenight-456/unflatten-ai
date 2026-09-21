import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UploadZone } from './UploadZone';
import { InteractiveSky } from './InteractiveSky';
import { Project } from '../types';
import { 
  ArrowUpRight, 
  Sparkles, 
  Layers, 
  Palette, 
  Check, 
  Star, 
  Zap, 
  Copy, 
  Code2, 
  Download, 
  Clock, 
  Trash2, 
  Play, 
  ShieldCheck, 
  Eye, 
  ChevronRight,
  Sliders,
  FileImage,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface LandingPageProps {
  onFileSelect: (file: File) => void;
  recentProjects: Project[];
  onLoadProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onFileSelect, 
  recentProjects, 
  onLoadProject,
  onDeleteProject
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'features' | 'about' | 'docs'>('home');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [mobilePreviewTab, setMobilePreviewTab] = useState<'palette' | 'layers' | 'prompt'>('palette');

  const scrollToUpload = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyHex = (hex: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  // Helper to load high quality sample image
  const handleLoadSample = (sampleType: 'donut' | 'cyberpunk' | 'nature' | 'glamour') => {
    const is916 = sampleType === 'glamour';
    const canvas = document.createElement('canvas');
    canvas.width = is916 ? 720 : 1000;
    canvas.height = is916 ? 1280 : 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (sampleType === 'glamour') {
      // 9:16 Glamour Boutique Flyer
      // Background: Deep Blue to dark navy luxury silk
      const bgGrad = ctx.createLinearGradient(0, 0, 720, 1280);
      bgGrad.addColorStop(0, '#1e3a8a');
      bgGrad.addColorStop(0.5, '#0f1f4b');
      bgGrad.addColorStop(1, '#050a18');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 720, 1280);

      // Silk draping aesthetic curves
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)'; // Silver accent
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 300 + i * 80);
        ctx.bezierCurveTo(240, 200 + i * 80, 480, 450 + i * 80, 720, 350 + i * 80);
        ctx.stroke();
      }

      // Gold highlight glow
      const goldGlow = ctx.createRadialGradient(360, 220, 20, 360, 220, 280);
      goldGlow.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
      goldGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = goldGlow;
      ctx.fillRect(0, 0, 720, 600);

      // Gold top accent line
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(260, 90, 200, 3);

      // Brand Title: Glamour Boutique
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 52px serif';
      ctx.textAlign = 'center';
      ctx.fillText('Glamour Boutique', 360, 165);

      // Tagline: Where Fashion Meets Art
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'italic 500 22px serif';
      ctx.fillText('Where Fashion Meets Art', 360, 210);

      // Section: New Arrivals Badge
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(240, 255, 240, 38);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('NEW ARRIVALS', 360, 280);

      // Offerings List
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '300 18px sans-serif';
      ctx.fillText('Custom Kaftans  •  Designer Suits  •  T-shirts', 360, 330);

      // Luxury Mannequin Silhouettes & Garments
      // Center pedestal
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(180, 820, 360, 40);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.strokeRect(180, 820, 360, 40);

      // Center Hero Mannequin (Kaftan silhouette)
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(360, 430);
      ctx.bezierCurveTo(390, 450, 410, 500, 415, 620);
      ctx.lineTo(440, 810);
      ctx.lineTo(280, 810);
      ctx.lineTo(305, 620);
      ctx.bezierCurveTo(310, 500, 330, 450, 360, 430);
      ctx.fill();

      // Gold Kaftan embroidery details
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(360, 440);
      ctx.lineTo(360, 720);
      ctx.stroke();

      // Mannequin Head Oval
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(360, 395, 22, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Left Mannequin (Suit silhouette)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.moveTo(220, 480);
      ctx.lineTo(270, 520);
      ctx.lineTo(260, 800);
      ctx.lineTo(170, 800);
      ctx.lineTo(180, 520);
      ctx.closePath();
      ctx.fill();

      // Right Mannequin (Designer silhouette)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.moveTo(500, 480);
      ctx.lineTo(540, 520);
      ctx.lineTo(550, 800);
      ctx.lineTo(460, 800);
      ctx.lineTo(450, 520);
      ctx.closePath();
      ctx.fill();

      // Call To Action: Shop Now (Gold Button)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(260, 890, 200, 56, 28);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('SHOP NOW', 360, 926);

      // Contact Details at Bottom
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 15px sans-serif';
      ctx.fillText('📞 +233 55 488 6122', 360, 1020);
      ctx.fillText('📸 @latenight  •  📍 my-dms', 360, 1055);

      // Footer brand accent
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.font = '12px serif';
      ctx.fillText('GLAMOUR BOUTIQUE LUXURY COLLECTION', 360, 1180);

    } else if (sampleType === 'donut') {
      // Soft pastel background
      const bgGrad = ctx.createLinearGradient(0, 0, 1000, 1000);
      bgGrad.addColorStop(0, '#FFE8D6');
      bgGrad.addColorStop(1, '#FFCDB2');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1000, 1000);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.ellipse(500, 780, 280, 60, 0, 0, Math.PI * 2);
      ctx.fill();

      // Donut Base Dough
      ctx.fillStyle = '#E8A86B';
      ctx.beginPath();
      ctx.arc(500, 480, 240, 0, Math.PI * 2);
      ctx.fill();

      // Donut Frosting Pink
      ctx.fillStyle = '#FF5D8F';
      ctx.beginPath();
      ctx.arc(500, 480, 225, 0, Math.PI * 2);
      ctx.fill();

      // Donut Hole
      ctx.fillStyle = '#FFE8D6';
      ctx.beginPath();
      ctx.arc(500, 480, 85, 0, Math.PI * 2);
      ctx.fill();

      // Colorful Sprinkles
      const sprinkleColors = ['#FFE066', '#70D6FF', '#FFFFFF', '#38B000', '#FF9E00'];
      for (let i = 0; i < 35; i++) {
        const angle = (i / 35) * Math.PI * 2;
        const dist = 135 + (i % 4) * 18;
        const x = 500 + Math.cos(angle) * dist;
        const y = 480 + Math.sin(angle) * dist;
        ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Title Typography
      ctx.fillStyle = '#3A0818';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GLAZED DREAMS', 500, 160);

      ctx.font = '500 28px sans-serif';
      ctx.fillStyle = '#6D3848';
      ctx.fillText('ARTISANAL FRESH BAKED DONUTS', 500, 215);

      // Price Tag Badge
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.roundRect(400, 840, 200, 60, 30);
      ctx.fill();
      ctx.fillStyle = '#D4FF32';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('$4.50 EACH', 500, 878);

    } else if (sampleType === 'cyberpunk') {
      ctx.fillStyle = '#0B0D19';
      ctx.fillRect(0, 0, 1000, 1000);

      // Glow circle
      const radial = ctx.createRadialGradient(500, 500, 50, 500, 500, 400);
      radial.addColorStop(0, '#7928CA');
      radial.addColorStop(0.6, '#0070F3');
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, 1000, 1000);

      ctx.fillStyle = '#00F5D4';
      ctx.font = '900 76px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEO MATRIX', 500, 460);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('DECENTRALIZED NEURAL LAYERS', 500, 540);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, 1000);
      grad.addColorStop(0, '#10B981');
      grad.addColorStop(1, '#064E3B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1000, 1000);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 64px serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOTANICAL BOTANY', 500, 450);

      ctx.font = '300 24px sans-serif';
      ctx.fillText('ORGANIC FOREST HARVEST', 500, 520);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${sampleType}-poster-sample.png`, { type: 'image/png' });
        onFileSelect(file);
      }
    });
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth bg-white selection:bg-[#D4FF32] selection:text-black font-sans text-slate-900">
      {/* =========================================================================
          1. HERO CONTAINER WITH INTERACTIVE SKY, REACTIVE CLOUDS & BIRDS
      ========================================================================= */}
      <InteractiveSky>
        {/* 1.1 FULL-BLEED TOP NAVIGATION BAR */}
        <header className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4FF32]" />
            </div>
            <span className="font-bold text-lg sm:text-2xl tracking-tight text-white flex items-center drop-shadow-sm">
              Unflatten<span className="text-[#D4FF32] font-black">AI</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-white/90 drop-shadow-sm">
            <button 
              onClick={() => setActiveTab('home')}
              className={`hover:text-white transition-colors ${activeTab === 'home' ? 'text-white font-semibold' : 'text-white/80'}`}
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('features-section')}
              className="hover:text-white transition-colors text-white/80"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('about-section')}
              className="hover:text-white transition-colors text-white/80"
            >
              About Us
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors text-white/80"
            >
              How It Works
            </button>
            <a 
              href="https://ai.google.dev" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-white transition-colors text-white/80 flex items-center gap-1"
            >
              Docs <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </a>
          </nav>

          {/* Right CTA Button */}
          <div className="flex items-center space-x-3">
            <button
              id="nav-get-started-btn"
              onClick={scrollToUpload}
              className="bg-[#D4FF32] hover:bg-[#c2f01f] text-black font-bold rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm tracking-tight transition-all duration-200 shadow-lg shadow-black/10 active:scale-95 flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </header>

        {/* 1.2 HERO CONTENT */}
        <section className="relative pt-8 sm:pt-16 pb-16 sm:pb-32 px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center z-10">
          {/* Large Impact Headline with Exact Requested Phrasing */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.15] max-w-4xl text-balance drop-shadow-md"
          >
            Deconstruct Flat images into Editable prompt layers
          </motion.h1>

          {/* Subheadline explaining the Gemini 2.5 capability */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl text-blue-50/95 max-w-2xl font-normal leading-relaxed text-balance drop-shadow-xs"
          >
            We help creators unlock editable design assets from static screenshots using zero-shot AI segmentation, prompt synthesis, and color palette deduction.
          </motion.p>

        </section>

        {/* 1.3 SHOWCASE SECTION OVER CLOUDS */}
        <div className="relative pb-12 sm:pb-24 pt-2">
          {/* Mobile Clean Focus Card (Optimized, uncluttered, no 3D skew) */}
          <div className="block md:hidden relative z-10 max-w-sm mx-auto px-4">
            {/* Mobile Tab Switcher */}
            <div className="flex items-center justify-center p-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 mb-4 text-xs font-semibold">
              <button
                onClick={() => setMobilePreviewTab('palette')}
                className={`flex-1 py-1.5 px-3 rounded-full transition-all ${
                  mobilePreviewTab === 'palette' 
                    ? 'bg-[#D4FF32] text-black shadow-sm font-bold' 
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Palette
              </button>
              <button
                onClick={() => setMobilePreviewTab('layers')}
                className={`flex-1 py-1.5 px-3 rounded-full transition-all ${
                  mobilePreviewTab === 'layers' 
                    ? 'bg-[#D4FF32] text-black shadow-sm font-bold' 
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Layers
              </button>
              <button
                onClick={() => setMobilePreviewTab('prompt')}
                className={`flex-1 py-1.5 px-3 rounded-full transition-all ${
                  mobilePreviewTab === 'prompt' 
                    ? 'bg-[#D4FF32] text-black shadow-sm font-bold' 
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Prompt DNA
              </button>
            </div>

            {/* Mobile Card Content */}
            <div className="rounded-3xl bg-white text-slate-900 p-5 shadow-2xl border-2 border-[#D4FF32] transition-all">
              {mobilePreviewTab === 'palette' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0975C6] bg-blue-50 px-2 py-0.5 rounded-full">
                        AI Deduction
                      </span>
                      <h4 className="font-extrabold text-base text-slate-900 mt-1">Glazed Confection</h4>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Swatches */}
                  <div className="bg-slate-900 rounded-2xl p-3 flex items-center justify-center -space-x-1.5 my-3 shadow-inner">
                    {[
                      { hex: '#FFE8D6', name: 'Alabaster' },
                      { hex: '#FF5D8F', name: 'Pastel Rose' },
                      { hex: '#E8A86B', name: 'Warm Crumb' },
                      { hex: '#3A0818', name: 'Dark Cherry' },
                      { hex: '#D4FF32', name: 'Electric Lime' }
                    ].map((swatch, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => handleCopyHex(swatch.hex, e)}
                        style={{ backgroundColor: swatch.hex }}
                        className="w-9 h-9 rounded-full border-2 border-slate-900 shadow-md active:scale-110 transition-transform flex items-center justify-center"
                        title={swatch.name}
                      >
                        {copiedHex === swatch.hex && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-600">
                    <span className="p-1.5 rounded-lg bg-slate-50 text-center">#FFE8D6 (Bg)</span>
                    <span className="p-1.5 rounded-lg bg-slate-50 text-center">#FF5D8F (Accent)</span>
                    <span className="p-1.5 rounded-lg bg-slate-50 text-center">#3A0818 (Text)</span>
                    <span className="p-1.5 rounded-lg bg-slate-50 text-center">#D4FF32 (Neon)</span>
                  </div>
                </div>
              )}

              {mobilePreviewTab === 'layers' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-bold text-slate-900">Isolated Layer Segmentation</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold">Alpha PNG</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">🍩 Donut Graphic</p>
                      <span className="text-[10px] text-slate-500 font-mono">BBox: [210, 180, 790, 810]</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600">Layer 1</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">📝 "GLAZED DREAMS"</p>
                      <span className="text-[10px] text-slate-500 font-mono">Font: Sans-Serif • OCR</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600">Layer 2</span>
                  </div>
                </div>
              )}

              {mobilePreviewTab === 'prompt' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-[#D4FF32] text-black flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Synthesized Visual Prompt</span>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-3.5 text-[11px] font-mono text-slate-200 leading-relaxed">
                    "Artisanal glazed donut with pink icing, vibrant sprinkles, soft studio backdrop lighting, isolated composition, 4k render."
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="text-[#0975C6] font-semibold">Gemini 2.5 Flash</span>
                    <span className="text-[10px] font-mono">99.4% Match</span>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Ready to remix</span>
                <button 
                  onClick={scrollToUpload}
                  className="text-[#0975C6] font-bold flex items-center gap-1 hover:underline"
                >
                  Try Your Own <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Panoramic 3D Carousel Deck (hidden on small mobile screens) */}
          <div className="hidden md:block relative z-10 max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center gap-3 sm:gap-5 overflow-x-auto py-6 sm:py-8 px-4 no-scrollbar [perspective:1200px]">
              
              {/* Card 1: Leftmost Tilted (-18 deg) */}
              <motion.div 
                whileHover={{ scale: 1.05, rotateY: 0, zIndex: 20 }}
                className="hidden lg:block shrink-0 w-52 h-64 rounded-2xl bg-white/95 text-slate-800 p-4 shadow-2xl border border-white/60 backdrop-blur-md transform-gpu transition-all duration-300 [transform:rotateY(-18deg)_translateZ(-20px)]"
              >
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-mono">
                  <span>LAYER #01</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="w-full h-28 rounded-xl bg-gradient-to-tr from-amber-100 to-rose-100 flex items-center justify-center p-3">
                  <div className="w-16 h-16 rounded-full border-4 border-dashed border-rose-400 flex items-center justify-center text-xs font-bold text-rose-600 bg-white shadow-sm">
                    🍩 Alpha
                  </div>
                </div>
                <div className="mt-3">
                  <h4 className="font-bold text-xs text-slate-900 truncate">Isolated Graphic Object</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Transparent PNG • 0-1000 Box</p>
                </div>
              </motion.div>

              {/* Card 2: Mid-Left Tilted (-9 deg) */}
              <motion.div 
                whileHover={{ scale: 1.05, rotateY: 0, zIndex: 20 }}
                className="shrink-0 w-56 sm:w-60 h-72 rounded-2xl bg-white text-slate-800 p-5 shadow-2xl border border-white/80 backdrop-blur-md transform-gpu transition-all duration-300 [transform:rotateY(-9deg)_translateZ(0px)]"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="font-semibold text-slate-700">Typography Decomp</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">OCR+</span>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs font-black text-slate-900">"GLAZED DREAMS"</p>
                    <span className="text-[9px] text-slate-400 font-mono">Font: Sans-Serif • #3A0818</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-700">"ARTISANAL DONUTS"</p>
                    <span className="text-[9px] text-slate-400 font-mono">Weight: Medium • #6D3848</span>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                  <span>3 Text Layers</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>

              {/* Card 3: CENTER HERO CARD (Focus, 0 deg with Electric Lime Glow) */}
              <motion.div 
                whileHover={{ scale: 1.04, zIndex: 30 }}
                className="shrink-0 w-64 sm:w-72 h-80 rounded-3xl bg-white text-slate-900 p-5 sm:p-6 shadow-2xl border-2 border-[#D4FF32] transform-gpu transition-all duration-300 relative z-10 flex flex-col justify-between"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4FF32] text-black text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Active Palette Deduced
                </div>

                <div>
                  <div className="flex items-center justify-between mt-1 mb-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">Glazed Confection</h4>
                      <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Analogous Warm Harmony</p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Overlapping Swatch Pill */}
                  <div className="bg-slate-900 rounded-2xl p-3 flex items-center justify-center -space-x-2 my-3 shadow-inner">
                    {[
                      { hex: '#FFE8D6', name: 'Alabaster' },
                      { hex: '#FF5D8F', name: 'Pastel Rose' },
                      { hex: '#E8A86B', name: 'Warm Crumb' },
                      { hex: '#3A0818', name: 'Dark Cherry' },
                      { hex: '#D4FF32', name: 'Electric Lime' }
                    ].map((swatch, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => handleCopyHex(swatch.hex, e)}
                        style={{ backgroundColor: swatch.hex }}
                        className="w-8 h-8 rounded-full border-2 border-slate-900 shadow-md hover:scale-125 transition-transform relative group flex items-center justify-center"
                        title={`${swatch.name} (${swatch.hex})`}
                      >
                        {copiedHex === swatch.hex && <Check className="w-3 h-3 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-500">
                    <span className="p-1 rounded bg-slate-50">#FFE8D6 (Bg)</span>
                    <span className="p-1 rounded bg-slate-50">#FF5D8F (Accent)</span>
                    <span className="p-1 rounded bg-slate-50">#3A0818 (Text)</span>
                    <span className="p-1 rounded bg-slate-50">#D4FF32 (Neon)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">5 Deductions</span>
                  <span className="text-[#0975C6] font-bold flex items-center gap-1">
                    Export CSS <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>

              {/* Card 4: Mid-Right Tilted (+9 deg, Dark Charcoal for Contrast) */}
              <motion.div 
                whileHover={{ scale: 1.05, rotateY: 0, zIndex: 20 }}
                className="shrink-0 w-56 sm:w-60 h-72 rounded-2xl bg-[#111111] text-white p-5 shadow-2xl border border-white/10 backdrop-blur-md transform-gpu transition-all duration-300 [transform:rotateY(9deg)_translateZ(0px)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-[#D4FF32] text-black flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">Visual DNA Prompt</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 font-mono text-[10px] text-slate-300 leading-relaxed">
                    "Artisanal glazed donut with pink icing, vibrant sprinkles, soft studio backdrop lighting, isolated composition, 4k render."
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
                  <span className="text-[#D4FF32] font-semibold">Gemini 2.5</span>
                  <span className="text-[10px] text-slate-500 font-mono">99.4% Match</span>
                </div>
              </motion.div>

              {/* Card 5: Rightmost Tilted (+18 deg) */}
              <motion.div 
                whileHover={{ scale: 1.05, rotateY: 0, zIndex: 20 }}
                className="hidden lg:block shrink-0 w-52 h-64 rounded-2xl bg-white text-slate-800 p-4 shadow-2xl border border-white/60 backdrop-blur-md transform-gpu transition-all duration-300 [transform:rotateY(18deg)_translateZ(-20px)]"
              >
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-700">Data Analytics</span>
                  <span className="w-2 h-2 rounded-full bg-[#0975C6]" />
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">520k+</div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Layers extracted monthly for UI & vector workflows.
                </p>
                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <Zap className="w-3 h-3" />
                  <span>&lt; 3.2s Processing Time</span>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </InteractiveSky>

      {/* =========================================================================
          2. LOGO CLOUD / PARTNER STRIP (Clean White Background)
      ========================================================================= */}
      <section className="bg-white py-10 sm:py-14 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
            Powering Next-Gen Workflows Across Creative Suites
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
            {['Figma', 'Canva', 'Adobe Creative', 'Google AI', 'Framer', 'Webflow', 'Sketch'].map((brand, i) => (
              <div key={i} className="flex items-center gap-2 font-bold text-slate-700 text-sm sm:text-base tracking-tight">
                <div className="w-3.5 h-3.5 rounded-full bg-slate-400" />
                <span>{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. ABOUT US & VALUE PROPOSITION WITH INLINE BADGES
      ========================================================================= */}
      <section id="about-section" className="py-20 sm:py-28 bg-[#FFFFFF] px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0975C6] bg-blue-50 border border-blue-100 px-3.5 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0975C6]" />
            <span>About UnflattenAI</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.15] text-balance">
            A visual decomposition engine dedicated to building{' '}
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-base sm:text-2xl font-bold bg-[#1E88E5] text-white shadow-xs align-middle">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              smarter
            </span>{' '}
            and{' '}
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-base sm:text-2xl font-bold bg-[#D4FF32] text-black shadow-xs align-middle">
              <span className="w-2 h-2 rounded-full bg-black" />
              more adaptive
            </span>{' '}
            design assets.
          </h2>

          <p className="mt-8 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            UnflattenAI turns flat screenshots, exported mockups, and client graphics into structured, layer-separated compositions with pixel-accurate alpha masks and reproducible prompts.
          </p>
        </div>
      </section>

      {/* =========================================================================
          4. BENTO GRID & FEATURE CARDS (Lower Section)
      ========================================================================= */}
      <section id="features-section" className="py-12 pb-28 bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full mb-4">
              <span>Platform Capabilities</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Crafted for Precision, Speed, and Creative Freedom
            </h3>
          </div>

          {/* Bento Grid Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

            {/* CARD 1: Rich Sky Blue Visual Card (Spans 2 cols on lg) */}
            <div className="md:col-span-2 lg:col-span-2 rounded-3xl bg-gradient-to-br from-[#0975C6] via-[#1E88E5] to-[#71C4FF] text-white p-6 sm:p-10 shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold tracking-wider text-xs sm:text-sm uppercase text-white/90">UNFLATTEN DECOMP</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <Layers className="w-4 h-4 text-[#D4FF32]" />
                  </div>
                </div>

                {/* Layer accuracy graphic */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 max-w-md my-4">
                  <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                    <span className="font-bold">Zero-Shot Semantic Segmentation</span>
                    <span className="text-[#D4FF32] font-mono font-bold">100% Isolated</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                    <div className="h-full bg-[#D4FF32] rounded-full w-[94%]" />
                  </div>
                  <p className="text-[11px] text-white/80 mt-3 leading-relaxed">
                    Identifies foreground objects, overlays, floating typography, and background layers with high-precision bounding boxes.
                  </p>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/15">
                <div className="text-3xl sm:text-5xl font-black text-white tracking-tight">120+</div>
                <p className="text-xs sm:text-sm text-blue-50/90 mt-1 font-medium">
                  Collaborating with leading AI and design technology providers.
                </p>
              </div>
            </div>

            {/* CARD 2: Soft Light Gray (#F1F5F9) Testimonial / Spec Card */}
            <div className="md:col-span-1 lg:col-span-1 rounded-3xl bg-[#F1F5F9] text-[#0F172A] p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Commitment to measurable
                </span>
                <div className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
                  100%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Layer Isolation & Coordinate Precision
                </p>
              </div>

              <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-200">
                <div className="flex items-center -space-x-2 mb-3">
                  {['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'].map((color, i) => (
                    <div key={i} className={`w-7 h-7 rounded-full ${color} border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-xs`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  "The AI layer decomposition completely reshaped how we deconstruct flat screenshots into editable designs. It's efficient, intelligent, and seamless."
                </p>
              </div>
            </div>

            {/* CARD 3: High-Impact Electric Lime (#D4FF32) Metric Card */}
            <div className="md:col-span-3 lg:col-span-1 rounded-3xl bg-[#D4FF32] text-[#0F172A] p-6 sm:p-8 shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-black/60 block mb-2">
                  Data Points
                </span>
                <div className="text-3xl sm:text-5xl font-black text-black tracking-tight">
                  520k+
                </div>
                <p className="text-xs sm:text-sm text-black/80 font-medium mt-2 sm:mt-3 leading-relaxed">
                  Analyzed monthly to power smarter generative remakes, color harmonies, and design assets.
                </p>
              </div>

              <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-black/10 flex items-center justify-between">
                <span className="text-xs font-extrabold text-black">Instant Analysis</span>
                <div className="w-8 h-8 rounded-full bg-black text-[#D4FF32] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* CARD 4: Dark Charcoal (#111111) Card for Contrast */}
            <div className="md:col-span-2 lg:col-span-2 rounded-3xl bg-[#111111] text-white p-6 sm:p-10 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Supported Formats</span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#D4FF32]">
                    <Download className="w-4 h-4" />
                  </div>
                </div>

                <div className="text-3xl sm:text-5xl font-black text-white tracking-tight">20+</div>
                <p className="text-xs sm:text-sm text-slate-400 mt-2">
                  Output formats & styling definitions ready for production.
                </p>

                <div className="mt-5 sm:mt-6 flex flex-wrap gap-1.5 sm:gap-2">
                  {['PSD Transparent PNGs', 'CSS Variables', 'Tailwind Config', 'JSON Schema', 'Raw Prompts', 'SVG Coordinates'].map((fmt, i) => (
                    <span key={i} className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] sm:text-xs font-mono text-slate-300">
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 sm:mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>Single-Click ZIP Archiving</span>
                <span className="text-[#D4FF32] font-semibold">Ready to Export</span>
              </div>
            </div>

            {/* CARD 5: Color Palette Theory Card */}
            <div className="md:col-span-1 lg:col-span-2 rounded-3xl bg-white text-slate-900 p-6 sm:p-10 border border-slate-200 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Color Palette Intelligence</span>
                  <Palette className="w-5 h-5 text-[#0975C6]" />
                </div>

                <h4 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Automated Color Harmony Deduction</h4>
                <p className="text-xs sm:text-sm text-slate-500 mb-5 sm:mb-6 leading-relaxed">
                  Extracts primary text, surface backgrounds, and high-impact accent tones with WCAG contrast verification and one-click code generation.
                </p>

                {/* Swatch Strip */}
                <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100 overflow-x-auto">
                  {[
                    { hex: '#0975C6', name: 'Sky Core' },
                    { hex: '#D4FF32', name: 'Electric Lime' },
                    { hex: '#111111', name: 'Dark Charcoal' },
                    { hex: '#F8FAFC', name: 'Off White' },
                    { hex: '#FF5D8F', name: 'Rose Accent' }
                  ].map((c, i) => (
                    <div key={i} className="flex-1 min-w-[52px] sm:min-w-[60px] text-center">
                      <div 
                        className="h-8 sm:h-10 rounded-xl shadow-xs border border-black/10 cursor-pointer hover:scale-105 transition-transform" 
                        style={{ backgroundColor: c.hex }}
                        onClick={(e) => handleCopyHex(c.hex, e)}
                        title={`Copy ${c.hex}`}
                      />
                      <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 block mt-1">{c.hex}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Tailwind & CSS Tokens</span>
                <span className="text-[#0975C6] font-bold">Deduced Automatically</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          5. HOW IT WORKS / STEP-BY-STEP BREAKDOWN
      ========================================================================= */}
      <section id="how-it-works" className="py-24 bg-white px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0975C6] bg-blue-50 px-3 py-1 rounded-full">
              4-Step Neural Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              From Flat Pixels to Fully Editable Layer Stacks
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Semantic Scan",
                desc: "Gemini 2.5 Flash decomposes visual layout, identifying backgrounds, objects, buttons, and typography.",
                icon: <FileImage className="w-5 h-5" />
              },
              {
                step: "02",
                title: "Layer Masking",
                desc: "Our engine isolates each element into alpha-masked PNGs using a precise 0-1000 coordinate grid.",
                icon: <Layers className="w-5 h-5" />
              },
              {
                step: "03",
                title: "Visual DNA Synthesis",
                desc: "Every layer receives a custom generative prompt detailing lighting, style, and texture.",
                icon: <Sparkles className="w-5 h-5" />
              },
              {
                step: "04",
                title: "In-Situ Remix & Export",
                desc: "Tweak prompts, swap objects, extract palettes, and export PSD, CSS, and ZIP archives.",
                icon: <Download className="w-5 h-5" />
              }
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="p-7 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 hover:border-[#0975C6]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#0975C6]">
                      {item.icon}
                    </div>
                    <span className="text-3xl font-black text-slate-300 font-mono">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. RECENT PROJECTS SECTION (if any exist)
      ========================================================================= */}
      {recentProjects.length > 0 && (
        <section className="py-16 px-4 bg-[#F8FAFC] border-y border-slate-200">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Recent Projects</h3>
                <p className="text-xs text-slate-500">Pick up where you left off</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {recentProjects.map((project) => (
                <div key={project.id} className="group relative">
                  <div 
                    onClick={() => onLoadProject(project)}
                    className="aspect-[4/5] rounded-2xl bg-white border border-slate-200 overflow-hidden cursor-pointer transition-all duration-300 group-hover:border-[#0975C6] group-hover:shadow-lg relative"
                  >
                    <img 
                      src={project.imageMetadata.src} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      alt={project.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-3.5">
                      <p className="text-xs font-bold text-white truncate mb-0.5">{project.name}</p>
                      <p className="text-[10px] text-slate-300 font-mono">{formatDate(project.timestamp)}</p>
                    </div>
                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-[#D4FF32] rounded-full flex items-center justify-center shadow-xl text-black">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all z-20 shadow-md"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          7. INTERACTIVE UPLOAD / CTA WORKSPACE SECTION
      ========================================================================= */}
      <section id="upload-section" className="py-14 sm:py-28 px-3 sm:px-4 bg-white relative">
        <div className="max-w-4xl mx-auto text-center">
          
          <div className="mb-6 sm:mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0975C6] bg-blue-50 px-3 py-1 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Unflattening Now</span>
            </div>
            <h2 className="text-2xl sm:text-5xl font-black text-[#0F172A] tracking-tight">
              Ready to unflatten your image?
            </h2>
            <p className="text-slate-500 mt-2 sm:mt-3 text-xs sm:text-base max-w-lg mx-auto">
              Upload a screenshot, UI mockup, or graphic to decompose it into isolated prompt-driven layers.
            </p>
          </div>

          {/* Quick Demo Sample Buttons */}
          <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            <span className="text-xs text-slate-400 font-semibold mr-1 hidden sm:inline">Try Sample:</span>
            <button
              id="load-glamour-flyer-sample-btn"
              onClick={() => handleLoadSample('glamour')}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-800 hover:to-indigo-900 text-xs font-bold text-amber-300 transition-all flex items-center gap-1.5 border border-amber-400/40 shadow-sm"
            >
              <span>✨ Glamour Boutique (9:16 Flyer)</span>
            </button>
            <button
              onClick={() => handleLoadSample('donut')}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 border border-slate-200"
            >
              <span>🍩 Glazed Donut</span>
            </button>
            <button
              onClick={() => handleLoadSample('cyberpunk')}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 border border-slate-200"
            >
              <span>🚀 Cyber UI</span>
            </button>
            <button
              onClick={() => handleLoadSample('nature')}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 border border-slate-200"
            >
              <span>🌿 Botanical</span>
            </button>
          </div>

          {/* Main Upload Zone Container */}
          <div className="p-2 sm:p-5 rounded-3xl sm:rounded-[2.5rem] bg-[#F8FAFC] border-2 border-dashed border-slate-200 shadow-xl">
            <UploadZone onFileSelect={onFileSelect} />
          </div>

        </div>
      </section>

      {/* =========================================================================
          8. MODERN CLEAN SAAS FOOTER
      ========================================================================= */}
      <footer className="py-16 border-t border-slate-200 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-8 md:flex-row">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#0975C6] flex items-center justify-center shadow-md">
              <Layers className="w-4 h-4 text-[#D4FF32]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Unflatten<span className="text-[#D4FF32]">AI</span>
            </span>
          </div>

          {/* Center Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">
              Home
            </button>
            <button onClick={() => scrollToSection('features-section')} className="hover:text-white transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('about-section')} className="hover:text-white transition-colors">
              About Us
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">
              How It Works
            </button>
            <a href="https://ai.google.dev" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Gemini 2.5 Docs
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right">
            <p className="text-xs text-slate-400">
              Powered by <span className="text-white font-semibold">Gemini 2.5 Flash</span> • Google AI Studio
            </p>
            <p className="text-[11px] text-slate-600 mt-1 font-mono">
              © {new Date().getFullYear()} UnflattenAI. All rights reserved.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
};
