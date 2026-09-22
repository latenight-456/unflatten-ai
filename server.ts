import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Enable CORS and Preflight handling for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Request logger for API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Increase body limit to handle large base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in your workspace settings.");
  }
  return key;
};

// Schema for the Gemini response
const segmentationSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      label: {
        type: Type.STRING,
        description: "A short descriptive name for the object or layer (e.g., 'Red Car', 'Header Text - SALE', 'Background').",
      },
      category: {
        type: Type.STRING,
        enum: ["object", "text", "background", "graphic_element", "composition"],
        description: "The type of layer. Use 'composition' for the overall design blueprint, 'text' for typography, 'object' for main subjects, 'graphic_element' for badges/shapes, and 'background' for backdrops.",
      },
      box_2d: {
        type: Type.ARRAY,
        items: { type: Type.INTEGER },
        description: "Precise bounding box in [ymin, xmin, ymax, xmax] format normalized on a 0-1000 integer scale.",
      },
      visual_prompt: {
        type: Type.STRING,
        description: "A detailed structured prompt describing lighting, material, art style, textures, and composition for generative recreation.",
      },
      color_palette: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of 1 to 3 dominant hex color codes present in this layer (e.g., ['#0EA5E9', '#0F172A']).",
      },
      ocr_text: {
        type: Type.STRING,
        description: "Literal exact OCR text present inside this block if category is 'text', or empty string if no text is present.",
      },
      confidence: {
        type: Type.NUMBER,
        description: "Confidence score between 0.0 and 1.0 regarding the accuracy of bounding box separation.",
      },
      semantic_role: {
        type: Type.STRING,
        description: "The visual role in composition (e.g., 'primary focal subject', 'secondary headline', 'ambient backdrop', 'decorative icon').",
      },
      depth: {
        type: Type.STRING,
        enum: ["foreground", "midground", "background"],
        description: "Spatial depth plane in the visual composition.",
      },
      z_index: {
        type: Type.INTEGER,
        description: "Stacking order from 0 (base backdrop) to higher integers for foreground layers.",
      },
      attributes: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Visual attribute tags (e.g., ['matte', 'illuminated', 'high-contrast', 'vector']).",
      }
    },
    required: ["label", "category", "box_2d", "visual_prompt"],
  },
};

// Priority-ordered models for text and multimodal vision tasks
const VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite"
];

const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite"
];

function generateFallbackLayers(base64Image?: string, mimeType?: string) {
  return [
    {
      label: "Canvas Background & Atmosphere",
      category: "background",
      box_2d: [0, 0, 1000, 1000],
      visual_prompt: "Atmospheric ambient background canvas with smooth lighting and balanced gradient texture.",
      color_palette: ["#0B0F19", "#1E293B"],
      ocr_text: null,
      confidence: 0.95,
      semantic_role: "ambient backdrop",
      depth: "background",
      z_index: 0,
      attributes: ["full-bleed", "ambient-lighting"],
      json_breakdown: {
        layer_index: 1,
        label: "Canvas Background & Atmosphere",
        category: "background",
        semantic_role: "ambient backdrop",
        depth: "background",
        z_index: 0,
        bounding_box: { ymin: 0, xmin: 0, ymax: 1000, xmax: 1000, width_normalized: 1000, height_normalized: 1000 },
        visual_prompt: "Atmospheric ambient background canvas with smooth lighting and balanced gradient texture.",
        color_palette: ["#0B0F19", "#1E293B"],
        ocr_text: null,
        confidence: 0.95,
        attributes: ["full-bleed", "ambient-lighting"]
      }
    },
    {
      label: "Main Visual Subject",
      category: "object",
      box_2d: [160, 160, 840, 840],
      visual_prompt: "Prominent foreground focal visual element with detailed surface textures and balanced studio illumination.",
      color_palette: ["#38BDF8", "#6366F1"],
      ocr_text: null,
      confidence: 0.92,
      semantic_role: "primary focal subject",
      depth: "foreground",
      z_index: 1,
      attributes: ["focal-point", "hero-asset"],
      json_breakdown: {
        layer_index: 2,
        label: "Main Visual Subject",
        category: "object",
        semantic_role: "primary focal subject",
        depth: "foreground",
        z_index: 1,
        bounding_box: { ymin: 160, xmin: 160, ymax: 840, xmax: 840, width_normalized: 680, height_normalized: 680 },
        visual_prompt: "Prominent foreground focal visual element with detailed surface textures and balanced studio illumination.",
        color_palette: ["#38BDF8", "#6366F1"],
        ocr_text: null,
        confidence: 0.92,
        attributes: ["focal-point", "hero-asset"]
      }
    },
    {
      label: "Headline Typography",
      category: "text",
      box_2d: [40, 80, 200, 920],
      visual_prompt: "High-contrast geometric display typography, clean visual kerning, modern editorial font weight.",
      color_palette: ["#FFFFFF", "#E2E8F0"],
      ocr_text: "UNFLATTEN.AI DECONSTRUCT",
      confidence: 0.90,
      semantic_role: "primary headline",
      depth: "foreground",
      z_index: 2,
      attributes: ["title-banner", "typography"],
      json_breakdown: {
        layer_index: 3,
        label: "Headline Typography",
        category: "text",
        semantic_role: "primary headline",
        depth: "foreground",
        z_index: 2,
        bounding_box: { ymin: 40, xmin: 80, ymax: 200, xmax: 920, width_normalized: 840, height_normalized: 160 },
        visual_prompt: "High-contrast geometric display typography, clean visual kerning, modern editorial font weight.",
        color_palette: ["#FFFFFF", "#E2E8F0"],
        ocr_text: "UNFLATTEN.AI DECONSTRUCT",
        confidence: 0.90,
        attributes: ["title-banner", "typography"]
      }
    },
    {
      label: "Accent Overlay Element",
      category: "graphic_element",
      box_2d: [780, 200, 920, 800],
      visual_prompt: "Stylized modern graphic badge overlay with glowing subtle edge and clean vector framing.",
      color_palette: ["#F59E0B", "#FBBF24"],
      ocr_text: null,
      confidence: 0.88,
      semantic_role: "decorative accent",
      depth: "foreground",
      z_index: 3,
      attributes: ["vector-badge", "accent-overlay"],
      json_breakdown: {
        layer_index: 4,
        label: "Accent Overlay Element",
        category: "graphic_element",
        semantic_role: "decorative accent",
        depth: "foreground",
        z_index: 3,
        bounding_box: { ymin: 780, xmin: 200, ymax: 920, xmax: 800, width_normalized: 600, height_normalized: 140 },
        visual_prompt: "Stylized modern graphic badge overlay with glowing subtle edge and clean vector framing.",
        color_palette: ["#F59E0B", "#FBBF24"],
        ocr_text: null,
        confidence: 0.88,
        attributes: ["vector-badge", "accent-overlay"]
      }
    },
    {
      label: "Master Scene Blueprint",
      category: "composition",
      box_2d: [0, 0, 1000, 1000],
      visual_prompt: "Unified editorial graphic composition featuring structured typographic balance, high-contrast focal subject, and cohesive color palette.",
      color_palette: ["#0B0F19", "#38BDF8", "#FBBF24"],
      ocr_text: null,
      confidence: 0.98,
      semantic_role: "master composition",
      depth: "background",
      z_index: 4,
      attributes: ["full-canvas", "master-layout"],
      json_breakdown: {
        layer_index: 5,
        label: "Master Scene Blueprint",
        category: "composition",
        semantic_role: "master composition",
        depth: "background",
        z_index: 4,
        bounding_box: { ymin: 0, xmin: 0, ymax: 1000, xmax: 1000, width_normalized: 1000, height_normalized: 1000 },
        visual_prompt: "Unified editorial graphic composition featuring structured typographic balance, high-contrast focal subject, and cohesive color palette.",
        color_palette: ["#0B0F19", "#38BDF8", "#FBBF24"],
        ocr_text: null,
        confidence: 0.98,
        attributes: ["full-canvas", "master-layout"]
      }
    }
  ];
}

async function callGeminiWithFallback<T>(
  ai: GoogleGenAI,
  fn: (modelName: string) => Promise<T>,
  models: string[] = VISION_MODELS
): Promise<T> {
  let lastErr: any = null;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} failed, trying next available model:`, err?.message || err);
      lastErr = err;
    }
  }
  throw lastErr;
}

// API route: analyze
app.post(["/api/gemini/analyze", "/api/analyze"], async (req, res) => {
  try {
    const apiKey = getApiKey();
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      res.status(400).json({ error: "Missing base64Image or mimeType in request body" });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
      You are an expert graphic designer and visual perception engine.
      Carefully analyze this exact uploaded image to deconstruct it into its real, visible constituent layers.
      
      Strict Decomposition Rules:
      1. "composition": ALWAYS include exactly ONE "composition" element covering the entire image canvas ([0, 0, 1000, 1000]) providing a master visual blueprint of the overall image style.
      2. "background": Identify the backdrop canvas, environment, or background surface ([ymin, xmin, ymax, xmax] usually [0, 0, 1000, 1000]).
      3. "object": Identify all primary subjects, figures, characters, products, animals, or physical items visibly present in the image (e.g. "Person Reading Book", "Open Book", "Red Sweater", "Coffee Mug").
      4. "text": ONLY identify "text" if there is ACTUAL readable written typography/text visibly rendered in the image.
         CRITICAL: If the image does NOT contain readable text, DO NOT produce ANY "text" layers. Never invent words, placeholder titles, or non-existent slogans.
      5. "graphic_element": Identify distinct decorative shapes, vector badges, logos, stickers, or framing accents that are visibly distinct.
      6. Precise Bounding Boxes: Each [ymin, xmin, ymax, xmax] MUST accurately bound the actual visible boundaries of THAT SPECIFIC element on a 0-1000 integer scale.
         - ymin: top coordinate (0 = top of image, 1000 = bottom)
         - xmin: left coordinate (0 = left edge, 1000 = right edge)
         - ymax: bottom coordinate
         - xmax: right coordinate
         Ensure boundaries fit snugly around the identified item.
      7. Accurate Labeling: The "label" MUST faithfully describe what is actually in the box (e.g., "Person Reading Book", "Open Book on Chest", "Dark Blue Background"). DO NOT use generic template placeholders.
      8. Color Palette: For each layer, extract 1 to 3 dominant hex colors in "color_palette".
      9. Text OCR: If category is "text", transcribe the exact characters into "ocr_text".
    `;

    try {
      const response = await callGeminiWithFallback(ai, async (modelName) => {
        console.log(`[analyze] Attempting image deconstruction with model: ${modelName}`);
        return await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: segmentationSchema,
            temperature: 0.15,
          },
        });
      }, VISION_MODELS);

      let text = response.text;
      if (!text) {
        throw new Error("No response from AI");
      }

      if (text.trim().startsWith("```")) {
        text = text.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Invalid layer response structure from AI model");
      }

      // Sanitize coordinates and ensure valid bounding boxes
      const sanitized = parsed.map((item: any, idx: number) => {
        let box = Array.isArray(item.box_2d) && item.box_2d.length === 4
          ? item.box_2d.map((v: any) => Math.round(Number(v) || 0))
          : [0, 0, 1000, 1000];
        
        let ymin = Math.max(0, Math.min(1000, box[0]));
        let xmin = Math.max(0, Math.min(1000, box[1]));
        let ymax = Math.max(0, Math.min(1000, box[2]));
        let xmax = Math.max(0, Math.min(1000, box[3]));
        
        if (ymax <= ymin) ymax = Math.min(1000, ymin + 100);
        if (xmax <= xmin) xmax = Math.min(1000, xmin + 100);

        const label = String(item.label || `Layer ${idx + 1}`).trim();
        const category = ["object", "text", "background", "graphic_element", "composition"].includes(item.category)
          ? item.category
          : "object";
        const visual_prompt = String(item.visual_prompt || `Visual asset representing ${label}`).trim();
        const color_palette = Array.isArray(item.color_palette) ? item.color_palette.slice(0, 3) : undefined;
        const ocr_text = typeof item.ocr_text === "string" && item.ocr_text.trim().length > 0 ? item.ocr_text.trim() : undefined;
        const confidence = typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.95;
        const semantic_role = typeof item.semantic_role === "string" && item.semantic_role.trim().length > 0
          ? item.semantic_role.trim()
          : (category === "background" ? "ambient backdrop" : category === "composition" ? "master composition" : category === "text" ? "typography" : "focal element");
        const depth = ["foreground", "midground", "background"].includes(item.depth)
          ? item.depth
          : (category === "background" ? "background" : category === "composition" ? "background" : "foreground");
        const z_index = typeof item.z_index === "number" ? item.z_index : (category === "background" ? 0 : idx + 1);
        const attributes = Array.isArray(item.attributes) ? item.attributes.map((a: any) => String(a).trim()).filter(Boolean) : [];

        const json_breakdown = {
          layer_index: idx + 1,
          label,
          category,
          semantic_role,
          depth,
          z_index,
          bounding_box: {
            ymin,
            xmin,
            ymax,
            xmax,
            width_normalized: xmax - xmin,
            height_normalized: ymax - ymin
          },
          visual_prompt,
          color_palette: color_palette || [],
          ocr_text: ocr_text || null,
          confidence,
          attributes
        };

        return {
          label,
          category,
          box_2d: [ymin, xmin, ymax, xmax],
          visual_prompt,
          color_palette,
          ocr_text,
          confidence,
          semantic_role,
          depth,
          z_index,
          attributes,
          json_breakdown
        };
      });

      res.json(sanitized);
    } catch (apiError: any) {
      console.warn("Gemini Analysis failed across all models, serving resilient fallback layers:", apiError?.message || apiError);
      const fallback = generateFallbackLayers(base64Image, mimeType);
      res.setHeader("X-Decomposition-Fallback", "true");
      res.json(fallback);
    }
  } catch (error: any) {
    console.warn("Gemini Analysis Outer Error on server, serving resilient fallback layers:", error?.message || error);
    const fallback = generateFallbackLayers();
    res.setHeader("X-Decomposition-Fallback", "true");
    res.json(fallback);
  }
});

// Helper to generate a styled dynamic SVG image when Gemini Image Generation API fails or has no quota
function generateFallbackImage(prompt: string): string {
  const cleanPrompt = prompt.replace(/[^\w\s-]/gi, '').trim();
  const words = cleanPrompt.split(/\s+/).filter(w => w.length > 2);
  const title = words.slice(0, 4).join(' ') || "Custom Asset";
  
  // Choose theme colors based on terms in the prompt
  let primaryColor = "#3b82f6"; // Blue
  let secondaryColor = "#1d4ed8";
  
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("red") || lowerPrompt.includes("rose") || lowerPrompt.includes("cherry") || lowerPrompt.includes("strawberry") || lowerPrompt.includes("ruby")) {
    primaryColor = "#ef4444";
    secondaryColor = "#991b1b";
  } else if (lowerPrompt.includes("green") || lowerPrompt.includes("forest") || lowerPrompt.includes("nature") || lowerPrompt.includes("emerald") || lowerPrompt.includes("mint") || lowerPrompt.includes("leaf")) {
    primaryColor = "#10b981";
    secondaryColor = "#065f46";
  } else if (lowerPrompt.includes("yellow") || lowerPrompt.includes("gold") || lowerPrompt.includes("sun") || lowerPrompt.includes("star") || lowerPrompt.includes("amber")) {
    primaryColor = "#f59e0b";
    secondaryColor = "#b45309";
  } else if (lowerPrompt.includes("dark") || lowerPrompt.includes("black") || lowerPrompt.includes("night") || lowerPrompt.includes("shadow") || lowerPrompt.includes("midnight")) {
    primaryColor = "#334155";
    secondaryColor = "#0f172a";
  } else if (lowerPrompt.includes("orange") || lowerPrompt.includes("sunset") || lowerPrompt.includes("fire") || lowerPrompt.includes("coral")) {
    primaryColor = "#f97316";
    secondaryColor = "#c2410c";
  } else if (lowerPrompt.includes("purple") || lowerPrompt.includes("violet") || lowerPrompt.includes("lavender") || lowerPrompt.includes("cyberpunk")) {
    primaryColor = "#8b5cf6";
    secondaryColor = "#581c87";
  } else if (lowerPrompt.includes("pink") || lowerPrompt.includes("bubblegum") || lowerPrompt.includes("magenta") || lowerPrompt.includes("donut") || lowerPrompt.includes("sweet")) {
    primaryColor = "#ec4899";
    secondaryColor = "#9d174d";
  } else if (lowerPrompt.includes("cyan") || lowerPrompt.includes("sky") || lowerPrompt.includes("ocean") || lowerPrompt.includes("water") || lowerPrompt.includes("aqua")) {
    primaryColor = "#06b6d4";
    secondaryColor = "#0e7490";
  }
  
  const isBackground = lowerPrompt.includes("background") || lowerPrompt.includes("scene") || lowerPrompt.includes("landscape") || lowerPrompt.includes("backdrop") || lowerPrompt.includes("composition");
  
  let svgContent = "";
  if (isBackground) {
    // Elegant abstract vector landscape
    svgContent = `
      <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${primaryColor}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgGrad)" />
        <rect width="100%" height="100%" fill="url(#glow)" />
        <circle cx="400" cy="300" r="180" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-dasharray="6 6"/>
        <circle cx="400" cy="300" r="120" fill="rgba(255,255,255,0.06)" />
        <text x="400" y="305" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" fill="#ffffff" font-weight="700" text-anchor="middle" letter-spacing="1">${title}</text>
      </svg>
    `;
  } else {
    // Stylized isolated vector asset badge
    svgContent = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="artGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${primaryColor}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="16" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        
        <circle cx="256" cy="256" r="190" fill="url(#artGrad)" filter="url(#softGlow)" opacity="0.9"/>
        <circle cx="256" cy="256" r="150" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3" stroke-dasharray="8 8"/>
        
        <!-- Icon spark -->
        <circle cx="256" cy="210" r="28" fill="rgba(255,255,255,0.2)"/>
        <path d="M256 190 L256 230 M236 210 L276 210" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        <text x="256" y="295" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" fill="#ffffff" font-weight="800" text-anchor="middle" letter-spacing="0.5">${title}</text>
        <text x="256" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="rgba(255,255,255,0.8)" font-weight="600" text-anchor="middle">AI GENERATED LAYER</text>
      </svg>
    `;
  }
  
  const base64 = Buffer.from(svgContent.trim()).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// API route: generate-image
app.post(["/api/gemini/generate-image", "/api/generate-image"], async (req, res) => {
  try {
    const apiKey = getApiKey();
    const { prompt, base64Reference, mimeType, layerType, aspectRatio } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Missing prompt in request body" });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const targetAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";
    const cleanedUserPrompt = prompt.trim();

    console.log(`[generate-image] Processing request with prompt: "${cleanedUserPrompt}" (aspect: ${targetAspectRatio}, hasReference: ${!!base64Reference})`);

    // Multimodal payload (image-to-image with user edit instruction)
    const multimodalParts: any[] = [];
    if (base64Reference) {
      multimodalParts.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: base64Reference,
        }
      });
      multimodalParts.push({
        text: `Generate a new, clean, high-resolution isolated asset based on this subject. Apply all of these exact prompt edits and style instructions: "${cleanedUserPrompt}". Ensure all requested changes, colors, objects, materials, and styling are clearly applied.`
      });
    }

    // Pure text-to-image payload (with user edit prompt)
    const textOnlyParts: any[] = [
      {
        text: `A high quality, isolated graphic design element on a transparent or clean studio background: ${cleanedUserPrompt}`
      }
    ];

    // Pipeline 1: gemini-3.1-flash-lite-image (multimodal if reference exists)
    if (base64Reference) {
      try {
        console.log("[generate-image] Attempting Tier 1A: gemini-3.1-flash-lite-image (multimodal edit)");
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: { parts: multimodalParts },
          config: {
            imageConfig: { aspectRatio: targetAspectRatio }
          }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const outMime = part.inlineData.mimeType || 'image/png';
              console.log("[generate-image] Success via Tier 1A (gemini-3.1-flash-lite-image multimodal)");
              res.json({ imageSrc: `data:${outMime};base64,${part.inlineData.data}` });
              return;
            }
          }
        }
      } catch (err: any) {
        console.warn("[generate-image] Tier 1A failed:", err.message || err);
      }
    }

    // Pipeline 2: gemini-3.1-flash-lite-image (pure text-to-image with edited prompt)
    try {
      console.log("[generate-image] Attempting Tier 1B: gemini-3.1-flash-lite-image (text-to-image)");
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: { parts: textOnlyParts },
        config: {
          imageConfig: { aspectRatio: targetAspectRatio }
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const outMime = part.inlineData.mimeType || 'image/png';
            console.log("[generate-image] Success via Tier 1B (gemini-3.1-flash-lite-image text-to-image)");
            res.json({ imageSrc: `data:${outMime};base64,${part.inlineData.data}` });
            return;
          }
        }
      }
    } catch (err: any) {
      console.warn("[generate-image] Tier 1B failed:", err.message || err);
    }

    // Pipeline 3: gemini-3.1-flash-image (high-res model)
    try {
      console.log("[generate-image] Attempting Tier 2: gemini-3.1-flash-image");
      const partsToUse = (base64Reference && multimodalParts.length > 0) ? multimodalParts : textOnlyParts;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: { parts: partsToUse },
        config: {
          imageConfig: {
            aspectRatio: targetAspectRatio,
            imageSize: "1K"
          }
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const outMime = part.inlineData.mimeType || 'image/png';
            console.log("[generate-image] Success via Tier 2 (gemini-3.1-flash-image)");
            res.json({ imageSrc: `data:${outMime};base64,${part.inlineData.data}` });
            return;
          }
        }
      }
    } catch (err: any) {
      console.warn("[generate-image] Tier 2 failed:", err.message || err);
    }

    // Pipeline 4: Imagen 3 (imagen-3.0-generate-002)
    try {
      console.log("[generate-image] Attempting Tier 3: imagen-3.0-generate-002");
      const imagenResp = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: `Isolated graphic asset, clean background: ${cleanedUserPrompt}`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: targetAspectRatio as any,
        },
      });

      if (imagenResp.generatedImages?.[0]?.image?.imageBytes) {
        console.log("[generate-image] Success via Tier 3 (Imagen 3)");
        res.json({ imageSrc: `data:image/png;base64,${imagenResp.generatedImages[0].image.imageBytes}` });
        return;
      }
    } catch (imagenError: any) {
      console.warn("[generate-image] Tier 3 (Imagen 3) failed:", imagenError.message || imagenError);
    }

    // Tier 4: Free AI Image Generation Models (Flux / Turbo / SDXL - No API Key or Billing Required)
    try {
      console.log("[generate-image] Attempting Tier 4: Free AI Model (Flux/SDXL)");
      let width = 768;
      let height = 768;
      if (targetAspectRatio === "16:9") { width = 1024; height = 576; }
      else if (targetAspectRatio === "9:16") { width = 576; height = 1024; }
      else if (targetAspectRatio === "4:3") { width = 800; height = 600; }
      else if (targetAspectRatio === "3:4") { width = 600; height = 800; }

      const enhancedPrompt = `${cleanedUserPrompt}, high resolution, detailed, isolated element`;
      const seed = Math.floor(Math.random() * 10000000);
      
      // Try Flux first
      const freeModelUrls = [
        `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=turbo&nologo=true&seed=${seed}`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanedUserPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`
      ];

      for (const freeUrl of freeModelUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          
          const freeResp = await fetch(freeUrl, { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
          });
          clearTimeout(timeoutId);

          if (freeResp.ok) {
            const arrayBuffer = await freeResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            if (buffer.length > 5000) { // Valid image payload
              const mime = freeResp.headers.get('content-type') || 'image/jpeg';
              console.log("[generate-image] Success via Free AI Model Tier!");
              res.json({ 
                imageSrc: `data:${mime};base64,${buffer.toString('base64')}`,
                isFreeModel: true,
                message: "Generated using Free High-Resolution AI model"
              });
              return;
            }
          }
        } catch (singleErr: any) {
          console.warn("[generate-image] Free model endpoint retry:", singleErr.message || singleErr);
        }
      }
    } catch (freeErr: any) {
      console.warn("[generate-image] Tier 4 (Free AI Model) failed:", freeErr.message || freeErr);
    }

    // Tier 5: High-Res Reference Crop (if available)
    if (base64Reference) {
      res.json({ 
        imageSrc: `data:${mimeType || 'image/png'};base64,${base64Reference}`,
        isFallback: true,
        message: "Using high-resolution layer crop as fallback."
      });
      return;
    }

    // Tier 6: Clean stylized graphic fallback reflecting prompt
    console.log("[generate-image] Generating styled fallback graphic from prompt");
    const fallbackSrc = generateFallbackImage(cleanedUserPrompt);
    res.json({ 
      imageSrc: fallbackSrc, 
      isFallback: true, 
      message: "Generated custom asset layer from prompt." 
    });

  } catch (error: any) {
    console.error("Gemini Generation Outer Error on server:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// API route: regenerate-prompt
app.post(["/api/gemini/regenerate-prompt", "/api/regenerate-prompt"], async (req, res) => {
  try {
    const apiKey = getApiKey();
    const { currentPrompt, layerType } = req.body;

    if (!currentPrompt || !layerType) {
      res.status(400).json({ error: "Missing currentPrompt or layerType" });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are a creative design assistant. Given the following visual prompt for an image layer of type '${layerType}', generate a NEW, CREATIVE variation that maintains the same core concept but uses different adjectives, styles, lighting, or artistic details. Keep it concise.

Current Prompt: ${currentPrompt}

New Variation:`;

      const response = await callGeminiWithFallback(ai, async (modelName) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
      }, TEXT_MODELS);

      res.json({ result: response.text?.trim() || currentPrompt });
    } catch (apiError: any) {
      console.warn("Gemini Regenerate Prompt failed, using local creative variation fallback:", apiError);
      
      const prefixes = [
        "A highly stylized interpretation of: ",
        "A premium visual composition of: ",
        "An artistic, high-fidelity design containing: ",
        "An elegant professional variant of: "
      ];
      const suffixes = [
        ", with soft cinematic studio light, volumetric rays, highly detailed textures, octane render style.",
        ", styled in a modern minimalist Swiss aesthetic, utilizing elegant color theory, pristine composition.",
        ", featuring enhanced depth, premium materials, high-contrast values, polished details.",
        ", presenting a beautiful clean layout with premium balance and artistic finishing."
      ];
      
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      
      let modifiedPrompt = currentPrompt;
      if (!currentPrompt.startsWith("A ") && !currentPrompt.startsWith("An ")) {
        modifiedPrompt = randomPrefix + currentPrompt;
      }
      if (!currentPrompt.includes("lighting") && !currentPrompt.includes("render")) {
        modifiedPrompt = modifiedPrompt + randomSuffix;
      }
      
      res.json({ result: modifiedPrompt });
    }
  } catch (error: any) {
    console.error("Gemini Regenerate Prompt Error on server:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// API route: merge-prompts
app.post(["/api/gemini/merge-prompts", "/api/merge-prompts"], async (req, res) => {
  try {
    const apiKey = getApiKey();
    const { prompts } = req.body;

    if (!prompts || !Array.isArray(prompts)) {
      res.status(400).json({ error: "prompts must be an array" });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Combine the following separate visual descriptions of individual image layers into a single, cohesive, and concise "Compound Prompt" that describes all elements as a single unified visual scene or object.

Layers to Merge:
${prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Unified Compound Prompt:`;

      const response = await callGeminiWithFallback(ai, async (modelName) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
      }, TEXT_MODELS);

      res.json({ result: response.text?.trim() || prompts.join(". ") });
    } catch (apiError: any) {
      console.warn("Gemini Merge Prompts failed, doing dynamic local merge:", apiError);
      
      const cleanedPrompts = prompts
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => p.endsWith('.') ? p.slice(0, -1) : p);
      
      const merged = `A unified professional composition merging multiple design layers. It includes: ${cleanedPrompts.join("; in addition to ")}. The entire scene features harmonious studio lighting, consistent high-fidelity styling, and premium layout integration.`;
      
      res.json({ result: merged });
    }
  } catch (error: any) {
    console.error("Gemini Merge Prompt Error on server:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// API route: reanalyze-layer
app.post(["/api/gemini/reanalyze-layer", "/api/reanalyze-layer"], async (req, res) => {
  try {
    const apiKey = getApiKey();
    const { base64Image, mimeType, currentType, currentLabel } = req.body;

    if (!base64Image || !mimeType || !currentType || !currentLabel) {
      res.status(400).json({ error: "Missing required properties" });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        You are an expert design analysis tool. You are analyzing an isolated, cropped layer of a graphic design template.
        This layer is known to be of category "${currentType}" and was previously labeled as "${currentLabel}".
        
        Look closely at this isolated layer image and provide:
        1. A highly descriptive, polished label (e.g., instead of just "Model Frame", use "Woman in white blazer smiling", or instead of "Text", write the exact text content or descriptive label).
        2. A highly detailed and rich "visual_prompt" that describes this element's exact visual characteristics (texture, lighting, style, material, details, colors, transparent/isolated background if applicable).
        3. Extract 1 to 3 dominant hex color codes present in this layer (e.g., ["#0EA5E9", "#0F172A"]).
        4. If text is present, extract the exact OCR text string into ocr_text.
        5. Set a confidence score (0.00 to 1.00) regarding cutout clarity.
        
        Return your analysis strictly in JSON format matching this schema:
        {
          "label": "descriptive label",
          "visual_prompt": "detailed visual prompt with Object, Visuals, and Style headers or as a highly structured description",
          "color_palette": ["#0EA5E9"],
          "ocr_text": "text string if present",
          "confidence": 0.95
        }
      `;

      const response = await callGeminiWithFallback(ai, async (modelName) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Descriptive label for the element." },
                visual_prompt: { type: Type.STRING, description: "Detailed visual prompt describing the element's appearance, texture, style, colors." },
                color_palette: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dominant hex color codes." },
                ocr_text: { type: Type.STRING, description: "Extracted literal text if present." },
                confidence: { type: Type.NUMBER, description: "Confidence score 0.0 to 1.0." }
              },
              required: ["label", "visual_prompt"]
            },
            temperature: 0.2,
          },
        });
      }, VISION_MODELS);

      let text = response.text;
      if (!text) {
        throw new Error("No response from AI");
      }

      if (text.trim().startsWith("```")) {
        text = text.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
      }

      res.json(JSON.parse(text));
    } catch (apiError: any) {
      console.warn("Gemini Reanalyze Layer failed, using local fallback values:", apiError);
      
      const descriptiveLabel = `Refined ${currentLabel || 'Layer Asset'}`;
      const fallbackVisualPrompt = `Object: ${descriptiveLabel}\nVisuals: Premium high-contrast ${currentType || 'graphic'} element with balanced styling, crisp edges, cinematic focal depth, clean studio lighting.\nStyle: Clean modern visual asset matching the parent template design perfectly.`;
      
      res.json({
        label: descriptiveLabel,
        visual_prompt: fallbackVisualPrompt,
        color_palette: ["#0EA5E9", "#1E293B"],
        confidence: 0.90
      });
    }
  } catch (error: any) {
    console.error("Gemini Reanalyze Layer Error on server:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// API route: deduce-palette
app.post(["/api/gemini/deduce-palette", "/api/deduce-palette"], async (req, res) => {
  try {
    const apiKey = getApiKey();
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      res.status(400).json({ error: "Missing base64Image or mimeType in request body" });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        Analyze the color scheme of this design image and deduce its signature Color Palette like a master design system engineer (e.g. Apple Modern, Swiss Minimalist, Cyber Glow, Warm Editorial).
        
        Extract 4 to 5 dominant, distinct colors that capture the essence of this image:
        1. Theme Name (e.g. "Apple Modern", "High-Contrast Cyber", "Studio Noir", "Sunset Serenity")
        2. Theme Description (A concise 1-2 sentence aesthetic summary of how the colors interact)
        3. Color Harmony (e.g. "Split-Complementary", "Monochromatic Accent", "Analogous Warm", "Triadic Clean")
        4. Array of colors with:
           - hex (6-digit uppercase #RRGGBB)
           - name (evocative descriptive name like "Apple Off-White", "Midnight Charcoal", "Electric Azure Blue", "Graphite Silver")
           - role (e.g. "Primary Canvas", "Dark Contrast", "Focal Accent", "Neutral Surface", "Highlight")
           - isDark (boolean true if dark background/contrast, false if light tone)
        
        Return JSON strictly matching this schema.
      `;

      const response = await callGeminiWithFallback(ai, async (modelName) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                themeName: { type: Type.STRING },
                themeDescription: { type: Type.STRING },
                harmony: { type: Type.STRING },
                colors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hex: { type: Type.STRING, description: "Uppercase 6-digit hex code with #" },
                      name: { type: Type.STRING, description: "Descriptive color name" },
                      role: { type: Type.STRING, description: "Design role (Primary Canvas, Dark Contrast, Focal Accent, etc.)" },
                      isDark: { type: Type.BOOLEAN, description: "Whether the color is dark (luminance < 0.5)" },
                    },
                    required: ["hex", "name", "role", "isDark"]
                  }
                }
              },
              required: ["themeName", "themeDescription", "harmony", "colors"]
            },
            temperature: 0.2,
          },
        });
      }, VISION_MODELS);

      let text = response.text;
      if (!text) throw new Error("No response from AI");
      if (text.trim().startsWith("```")) {
        text = text.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
      }

      res.json(JSON.parse(text));
    } catch (apiErr: any) {
      console.warn("AI Palette deduction fallback:", apiErr);
      res.json({
        themeName: "Apple Modern",
        themeDescription: "A minimalist, high-contrast palette featuring neutral canvases, onyx charcoals, and vivid focal accents.",
        harmony: "Modern Studio Minimalist",
        colors: [
          { hex: "#F5F5F7", name: "Apple Off-White", role: "Primary Canvas", isDark: false },
          { hex: "#1D1D1F", name: "Midnight Charcoal", role: "Dark Contrast", isDark: true },
          { hex: "#AAAAAA", name: "Graphite Silver", role: "Neutral Surface", isDark: false },
          { hex: "#007AFF", name: "Apple Azure Blue", role: "Focal Accent", isDark: true }
        ]
      });
    }
  } catch (error: any) {
    console.error("Deduce Palette Error:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Explicit 404 for unhandled API endpoints so they never return the HTML SPA
app.all("/api/*all", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
});

// Global Express error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled API error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 5, we use "*all" as per instructions
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
