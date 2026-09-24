import { DetectedElement, LayerType } from "../types";
import { downscaleForApi } from "../utils/imageDownscale";

export const analyzeImageStructure = async (
  base64Image: string,
  mimeType: string
): Promise<DetectedElement[]> => {
  try {
    const inputDataUrl = base64Image.startsWith("data:")
      ? base64Image
      : `data:${mimeType || "image/jpeg"};base64,${base64Image}`;
    const downscaled = await downscaleForApi(inputDataUrl);
    const downscaledBase64 = downscaled.dataUrl.includes(",")
      ? downscaled.dataUrl.split(",")[1]
      : downscaled.dataUrl;
    const payloadMimeType = downscaled.mimeType || mimeType;

    let response = await fetch("/api/gemini/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image: downscaledBase64, mimeType: payloadMimeType }),
    });

    // If 404, retry against alias /api/analyze
    if (response.status === 404) {
      console.warn("Retrying analyze against alias /api/analyze...");
      response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ base64Image: downscaledBase64, mimeType: payloadMimeType }),
      });
    }

    if (response.status === 413) {
      throw new Error("Image too large. Try a smaller image.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const generateElementImage = async (
  prompt: string,
  referenceImageSrc?: string,
  layerType?: string,
  aspectRatio?: string
): Promise<string> => {
  try {
    let base64Reference: string | undefined = undefined;
    let mimeType: string | undefined = undefined;

    if (referenceImageSrc) {
      const inputDataUrl = referenceImageSrc.startsWith("data:")
        ? referenceImageSrc
        : `data:image/jpeg;base64,${referenceImageSrc}`;
      const downscaled = await downscaleForApi(inputDataUrl);
      mimeType = downscaled.mimeType;
      base64Reference = downscaled.dataUrl.includes(",")
        ? downscaled.dataUrl.split(",")[1]
        : downscaled.dataUrl;
    }

    const response = await fetch("/api/gemini/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        prompt, 
        base64Reference, 
        mimeType, 
        layerType,
        aspectRatio 
      }),
    });

    if (response.status === 413) {
      throw new Error("Image too large. Try a smaller image.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.imageSrc;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const regeneratePrompt = async (currentPrompt: string, layerType: string): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/regenerate-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPrompt, layerType }),
    });

    if (response.status === 413) {
      throw new Error("Image too large. Try a smaller image.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Gemini Regenerate Prompt Error:", error);
    return currentPrompt;
  }
};

export const mergeLayerPrompts = async (prompts: string[]): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/merge-prompts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompts }),
    });

    if (response.status === 413) {
      throw new Error("Image too large. Try a smaller image.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Gemini Merge Prompt Error:", error);
    return prompts.join(". ");
  }
};

export const reanalyzeLayer = async (
  base64Image: string,
  mimeType: string,
  currentType: LayerType,
  currentLabel: string
): Promise<{ label: string; visual_prompt: string; color_palette?: string[]; ocr_text?: string; confidence?: number }> => {
  try {
    const inputDataUrl = base64Image.startsWith("data:")
      ? base64Image
      : `data:${mimeType || "image/jpeg"};base64,${base64Image}`;
    const downscaled = await downscaleForApi(inputDataUrl);
    const downscaledBase64 = downscaled.dataUrl.includes(",")
      ? downscaled.dataUrl.split(",")[1]
      : downscaled.dataUrl;
    const payloadMimeType = downscaled.mimeType || mimeType;

    const response = await fetch("/api/gemini/reanalyze-layer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        base64Image: downscaledBase64, 
        mimeType: payloadMimeType, 
        currentType, 
        currentLabel 
      }),
    });

    if (response.status === 413) {
      throw new Error("Image too large. Try a smaller image.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in reanalyzeLayer:", error);
    throw error;
  }
};

export const deduceColorPalette = async (
  base64Image: string,
  mimeType: string
): Promise<{ themeName: string; themeDescription: string; harmony: string; colors: Array<{ hex: string; name: string; role: string; isDark: boolean }> }> => {
  try {
    const inputDataUrl = base64Image.startsWith("data:")
      ? base64Image
      : `data:${mimeType || "image/jpeg"};base64,${base64Image}`;
    const downscaled = await downscaleForApi(inputDataUrl);
    const downscaledBase64 = downscaled.dataUrl.includes(",")
      ? downscaled.dataUrl.split(",")[1]
      : downscaled.dataUrl;
    const payloadMimeType = downscaled.mimeType || mimeType;

    const response = await fetch("/api/gemini/deduce-palette", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image: downscaledBase64, mimeType: payloadMimeType }),
    });

    if (response.status === 413) {
      throw new Error("Image too large. Try a smaller image.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in deduceColorPalette:", error);
    throw error;
  }
};


