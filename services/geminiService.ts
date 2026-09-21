import { DetectedElement, LayerType } from "../types";

export const analyzeImageStructure = async (
  base64Image: string,
  mimeType: string
): Promise<DetectedElement[]> => {
  try {
    const response = await fetch("/api/gemini/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image, mimeType }),
    });

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

    if (referenceImageSrc && referenceImageSrc.startsWith("data:")) {
      const match = referenceImageSrc.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Reference = match[2];
      }
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
    const response = await fetch("/api/gemini/reanalyze-layer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image, mimeType, currentType, currentLabel }),
    });

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
    const response = await fetch("/api/gemini/deduce-palette", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image, mimeType }),
    });

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

