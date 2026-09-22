# Unflatten.ai 🎨⚡

**Unflatten.ai** is an intelligent multimodal visual decomposition engine and generative layer studio. It reverse-engineers flattened graphics, raster renders, illustrations, product photos, and social media flyers into semantic, editable, and re-generable multi-plane layer stacks.

Powered by Gemini 2.5 Computer Vision and Generative AI, Unflatten.ai turns static pixels into an interactive studio canvas where individual elements can be isolated, moved, recomposed, re-prompted, and re-generated in real-time.

---

## 🌟 Key Capabilities & Features

### 1. Semantic Layer Decomposition
- **Deep Visual Parsing**: Detects objects, text blocks, graphic overlays, background textures, and composition planes using Gemini 2.5 Flash spatial vision (`box_2d` coordinate detection).
- **Automated Cropping & Isolation**: Automatically crops, segments, and normalizes detected elements into draggable, resizable canvas layers with absolute and percentage-based coordinates.
- **Hierarchical Layer Stack**: Categorizes detected elements into distinct types:
  - `OBJECT` (subjects, props, garments, focal items)
  - `TEXT` (headlines, taglines, labels, badges with integrated OCR extraction)
  - `GRAPHIC_ELEMENT` (badges, shapes, CTA buttons, decorative lines)
  - `BACKGROUND` (environmental scenery, gradient backdrops, atmospheric textures)
  - `COMPOSITION` (the master synthesized visual prompt)

### 2. Full Remix Master Prompt & Template Engine
- **Master Composition Synthesis**: Aggregates all detected layers, spatial depth planes, and palettes into a master AI prompt.
- **Social Media Flyer Blueprint (9:16 Aspect Ratio)**:
  - Specialized, production-grade template structure optimized for high-resolution flyers (Stories, Reels, TikTok, Ads).
  - Configurable branding fields: Concept, Brand Name, Tagline, Typography style, "New Arrivals" / Offering list, Product Visuals, Display Arrangement, Background & Lighting, Call to Action, and stylized contact details (Phone, Social Handle, Location).
  - Strict hex color mapping (e.g. Primary Blue `#1e3a8a`, Silver Accent `#94a3b8`, Gold Highlight `#fbbf24`).
- **Interactive Full Remix Prompt Modal**: Inspect, customize, and edit every prompt field in a structured form or directly in a live markdown editor before copying or generating.
- **Multi-Field Studio Layout**: Deconstructs compositions into Scene / Theme, Primary Headline, Subtext, Visual Elements Summary, and Stylistic Keywords (3D Studio Render, Cyberpunk, Cinematic, Minimalist, etc.).

### 3. Layer JSON Breakdown & Spatial Analytics
- **Standardized Spatial JSON**: Every layer is exported with detailed geometric and analytical metrics:
  - Normalized Bounding Box (`[ymin, xmin, ymax, xmax]`)
  - Pixel Coordinates (`x`, `y`, `width`, `height`, `aspect_ratio`)
  - Semantic Role & Depth Plane (`foreground`, `midground`, `background`)
  - Z-Index layering order
  - Visual Prompt & OCR transcribed text
  - Dedicated Color Swatches per layer
- **Instant JSON Inspector**: Dedicated workspace JSON viewer with one-click clipboard copying and schema validation.
- **ZIP Export**: Download all cropped layer assets alongside `layers_breakdown_analysis.json` and `color_palette.json`.

### 4. Harmonious Color Palette Extraction & Deduction
- **Canvas-Level & AI-Deduction**: Extracts dominant hues using canvas histogram clustering while leveraging Gemini for semantic color naming, psychological mood tags, and contrast scoring.
- **One-Click Injection**: Inject extracted color palettes directly into layer prompt parameters and flyer designs.

### 5. Interactive Layer Studio & Canvas
- **Transform Controls**: Drag, scale, and reposition isolated layers on an interactive viewport.
- **Visibility & Depth Ordering**: Toggle layer visibility, reorder z-indices, and isolate specific planes.
- **Per-Layer Generative Remixing**: Regenerate individual elements or the holistic composition with updated visual prompts.
- **Dynamic Physics & Interactive Hero**: Interactive fluid sky background with reactive flocking bird physics and responsive cloud dynamics.

---

## 🏗️ Architecture & Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Tailwind CSS with custom Swiss-style modular grid and neumorphic depth touches
- **Icons**: Lucide React
- **Animations & Physics**: Custom 60fps canvas loop with Reynolds flocking boids and velocity-based spring dampening
- **Image Processing**: Canvas API for client-side cropping, mask generation, and raster processing

### Backend (Full-Stack Proxy)
- **Server**: Express.js with TypeScript (`server.ts`), bundled via `esbuild` for production
- **Model Integration**: `@google/genai` TypeScript SDK (server-side only to protect API credentials)
  - `models/gemini-2.5-flash`: Fast vision analysis, bounding box parsing, OCR, and prompt generation
  - `models/imagen-3.0-generate-002` / Gemini image generation pipelines for generative remixing
- **Endpoints**:
  - `POST /api/gemini/analyze`: Deconstructs uploaded images into bounding boxes, OCR strings, and visual prompts.
  - `POST /api/gemini/generate-image`: Synthesizes high-resolution imagery from tailored prompt prompts.
  - `POST /api/gemini/regenerate-prompt`: Re-generates or expands prompts for individual layers.
  - `POST /api/gemini/merge-prompts`: Synthesizes multi-selected layers into unified compositional prompts.
  - `POST /api/gemini/reanalyze-layer`: Deeply inspects an isolated layer crop.
  - `POST /api/gemini/deduce-palette`: Extracts semantic palettes, hex codes, and mood associations.

---

## 📁 Project Structure

```
├── App.tsx                      # Main application orchestrator and workspace state
├── components/
│   ├── CanvasEditor.tsx         # Interactive canvas with layer manipulation & transform controls
│   ├── ColorPaletteSection.tsx  # Extracted and deduced color palette visualizer
│   ├── FullRemixPromptModal.tsx # Inspection & editing modal for master 9:16 & studio prompts
│   ├── InteractiveSky.tsx       # Flocking bird physics and interactive cloud hero canvas
│   ├── LandingPage.tsx          # Presentation landing hero with sample loader
│   ├── LayerJsonViewer.tsx      # Comprehensive JSON inspector for layers and metadata
│   ├── LayerList.tsx            # Left sidebar layer tree with visibility and z-index controls
│   ├── UploadZone.tsx           # Drag-and-drop & clipboard image ingest
│   └── WorkspaceSidePanel.tsx   # Tabbed studio control panel (Composition, Palette, Layers, JSON)
├── server.ts                    # Express server proxying Gemini 2.5 vision and generative APIs
├── types.ts                     # TypeScript definitions for layers, geometry, palettes, and metadata
├── utils/
│   ├── colorExtractor.ts        # Client-side color quantization and palette building
│   ├── imageCropper.ts          # Precise canvas bounding box cropping
│   ├── layerJson.ts             # Standardized layer breakdown and JSON formatting
│   └── promptTemplates.ts       # 9:16 social flyer prompt schema and template parsers
└── vite.config.ts               # Vite configuration with Tailwind integration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A Google Gemini API Key (`GEMINI_API_KEY`)

### Environment Setup
Create a `.env` file in the root directory (based on `.env.example`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Installation
```bash
npm install
```

### Development Server
Starts the Express server with Vite middleware on port 3000:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### Production Build
```bash
npm run build
npm start
```

---

## 💡 Typical Workflow

1. **Upload or Try a Sample**: Drop any PNG, JPG, or WEBP into the upload zone, or click **✨ Glamour Boutique (9:16 Flyer)** or sample presets on the landing page.
2. **Automated Deconstruction**: Unflatten.ai detects subjects, text elements, and backgrounds, generating bounding boxes and prompts.
3. **Inspect Layers & JSON**: Switch to the **JSON** or **Layers** tab in the workspace panel to review geometry, normalized coordinates, and prompts.
4. **Customize the Remix Prompt**: Open the **Full Remix Master Prompt** modal to fine-tune concept details, strict hex colors, offerings, and contact information.
5. **Re-generate & Export**: Trigger generation for new image assets or export the full layer stack, color palette, and JSON analysis in a packaged `.zip` archive.

---

## 📄 License
MIT License. Built with Google AI Studio & Gemini 2.5.
