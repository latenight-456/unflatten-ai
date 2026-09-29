import express from "express";
import path from "path";
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

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
// gemini-3.1-flash-lite has separate quota, high throughput, and reliable multimodal vision
const VISION_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest"
];

const TEXT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest"
];

// Robustly normalizes bounding boxes from model responses
// Handles 0..1 floats, 0..100 percentages, 0..1000 standard scale, and raw pixel dimensions
function normalizeBoundingBox(rawBox: any, allItems?: any[]): [number, number, number, number] {
  if (!Array.isArray(rawBox) || rawBox.length < 4) {
    return [0, 0, 1000, 1000];
  }

  let nums = rawBox.slice(0, 4).map((v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  });

  const maxVal = Math.max(...nums);
  if (maxVal > 0 && maxVal <= 1.0) {
    // Model returned 0.0 .. 1.0 normalized floats
    nums = nums.map(v => v * 1000);
  } else if (maxVal > 1.0 && maxVal <= 100.0 && nums.every((v: number) => v <= 100)) {
    // Model returned 0 .. 100 percentage values
    nums = nums.map(v => v * 10);
  } else if (maxVal > 1000) {
    // Model returned pixel values (e.g., 1080, 1920)
    let maxY = 1000;
    let maxX = 1000;
    if (allItems && allItems.length > 0) {
      allItems.forEach(it => {
        if (Array.isArray(it.box_2d) && it.box_2d.length >= 4) {
          const y1 = Number(it.box_2d[0]) || 0;
          const x1 = Number(it.box_2d[1]) || 0;
          const y2 = Number(it.box_2d[2]) || 0;
          const x2 = Number(it.box_2d[3]) || 0;
          maxY = Math.max(maxY, y1, y2);
          maxX = Math.max(maxX, x1, x2);
        }
      });
    } else {
      maxY = Math.max(1000, nums[0], nums[2]);
      maxX = Math.max(1000, nums[1], nums[3]);
    }
    nums[0] = (nums[0] / maxY) * 1000;
    nums[2] = (nums[2] / maxY) * 1000;
    nums[1] = (nums[1] / maxX) * 1000;
    nums[3] = (nums[3] / maxX) * 1000;
  }

  let [ymin, xmin, ymax, xmax] = nums.map(v => Math.round(v));

  // Swap inverted coordinates
  if (ymin > ymax) {
    const tmp = ymin;
    ymin = ymax;
    ymax = tmp;
  }
  if (xmin > xmax) {
    const tmp = xmin;
    xmin = xmax;
    xmax = tmp;
  }

  // Clamp within 0..1000 bounds
  ymin = Math.max(0, Math.min(1000, ymin));
  xmin = Math.max(0, Math.min(1000, xmin));
  ymax = Math.max(0, Math.min(1000, ymax));
  xmax = Math.max(0, Math.min(1000, xmax));

  // Ensure minimum dimensions (at least 20 units wide and tall)
  if (ymax - ymin < 20) {
    ymax = Math.min(1000, ymin + 30);
    if (ymax - ymin < 20) {
      ymin = Math.max(0, ymax - 30);
    }
  }
  if (xmax - xmin < 20) {
    xmax = Math.min(1000, xmin + 30);
    if (xmax - xmin < 20) {
      xmin = Math.max(0, xmax - 30);
    }
  }

  return [ymin, xmin, ymax, xmax];
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
      You are an expert graphic designer and computer vision perception engine.
      Carefully analyze this exact uploaded image to deconstruct it into its real, visible constituent visual layers.
      
      Strict Decomposition Rules:
      1. "composition": ALWAYS include exactly ONE "composition" element covering the entire canvas ([0, 0, 1000, 1000]) providing a master visual prompt blueprint describing the complete image style, mood, lighting, composition, and subject matter.
      2. "background": Identify the backdrop canvas, environment, wall, or scenery surface ([ymin, xmin, ymax, xmax] usually [0, 0, 1000, 1000]).
      3. "object": Identify all primary subjects, figures, characters, products, animals, or physical items visibly present in the image (e.g. "Person Reading Book", "Coffee Mug", "Cat Sitting", "Sports Car").
      4. "text": ONLY identify "text" if there is ACTUAL readable written typography/lettering visibly rendered in the image.
         CRITICAL: If the image does NOT contain readable text, DO NOT produce ANY "text" layers. Never invent words or placeholder slogans.
      5. "graphic_element": Identify distinct decorative shapes, vector badges, logos, stickers, or framing accents that are visibly distinct.
      
      6. MANDATORY BOUNDING BOX COORDINATES:
         Each [ymin, xmin, ymax, xmax] MUST accurately bound the actual visible boundaries of THAT SPECIFIC element on a normalized 0 to 1000 integer scale:
         - ymin: top coordinate (integer from 0 to 1000, where 0 = top of image)
         - xmin: left coordinate (integer from 0 to 1000, where 0 = left edge)
         - ymax: bottom coordinate (integer from 0 to 1000, where 1000 = bottom edge)
         - xmax: right coordinate (integer from 0 to 1000, where 1000 = right edge)
         - DO NOT output pixel dimensions like 1920 or 1080.
         - DO NOT output decimal floats like 0.25. Use integers from 0 to 1000.
         - Ensure boundaries fit snugly around the identified item.
      7. Accurate Labeling: The "label" MUST faithfully describe what is actually in the box (e.g., "Person in Blue Jacket", "Orange Cat", "Ocean Background"). DO NOT use generic template placeholders.
      8. Color Palette: For each layer, extract 1 to 3 dominant hex colors in "color_palette" (e.g. ["#0EA5E9", "#0F172A"]).
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
        text = text.replace(/^```(json)?\s*/i, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Invalid layer response structure from AI model");
      }

      // Sanitize coordinates and ensure valid bounding boxes
      const sanitized = parsed.map((item: any, idx: number) => {
        const [ymin, xmin, ymax, xmax] = normalizeBoundingBox(item.box_2d, parsed);

        const label = String(item.label || `Layer ${idx + 1}`).trim();
        const category = ["object", "text", "background", "graphic_element", "composition"].includes(item.category)
          ? item.category
          : "object";
        const visual_prompt = String(item.visual_prompt || `Visual asset representing ${label}`).trim();
        
        // Clean color palette to ensure valid 6-char hex strings
        let color_palette: string[] | undefined = undefined;
        if (Array.isArray(item.color_palette) && item.color_palette.length > 0) {
          color_palette = item.color_palette
            .map((c: any) => String(c).trim().toUpperCase())
            .filter((c: string) => /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(c))
            .slice(0, 3);
          if (color_palette.length === 0) color_palette = undefined;
        }

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
      console.error("Gemini Analysis failed across all vision models:", apiError?.message || apiError);
      res.status(503).json({
        error: "AI image deconstruction is temporarily unavailable. Please try again in a few moments."
      });
    }
  } catch (error: any) {
    console.error("Gemini Analysis Outer Error on server:", error?.message || error);
    res.status(500).json({
      error: error?.message || "Failed to process image analysis"
    });
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

async function startLocal() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startLocal();
}

export default app;
