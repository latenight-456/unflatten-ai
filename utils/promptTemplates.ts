import { Layer, LayerType, DeducedPalette } from '../types';

export interface FlyerPromptFields {
  aspectRatio: string;
  concept: string;
  colorSchemeSummary: string;
  primaryBlueHex: string;
  silverAccentHex: string;
  goldHighlightHex: string;
  brandName: string;
  typographyStyle: string;
  tagline: string;
  sectionTitle: string;
  offerings: string[];
  productVisuals: string;
  displayArrangement: string;
  backgroundTexture: string;
  lighting: string;
  callToAction: string;
  phone: string;
  socialMedia: string;
  location: string;
  overallFinish: string;
}

export type MasterPromptStructure = 'flyer_9_16' | 'studio_remix' | 'natural';

export const DEFAULT_GLAMOUR_FLYER_FIELDS: FlyerPromptFields = {
  aspectRatio: '9:16',
  concept: 'Elegant, modern, and minimalist',
  colorSchemeSummary: 'Deep blues and silvers with a touch of gold',
  primaryBlueHex: '#1e3a8a',
  silverAccentHex: '#94a3b8',
  goldHighlightHex: '#fbbf24',
  brandName: 'Glamour Boutique',
  typographyStyle: 'Elegant Serif with a glowing/premium effect. The text must be perfectly rendered, clear, and stylistically consistent with the theme.',
  tagline: 'Where Fashion Meets Art',
  sectionTitle: 'New Arrivals',
  offerings: ['Custom Kaftans', 'Designer Suits', 'Handcrafted T-shirts'],
  productVisuals: 'Ultra-realistic images of garments on mannequins',
  displayArrangement: 'Hero product front and center, with others slightly blurred in the background',
  backgroundTexture: 'A luxurious textured backdrop, like dark silk',
  lighting: 'Soft shadows and premium glossy highlights',
  callToAction: 'Shop Now',
  phone: '+233 55 488 6122',
  socialMedia: '@latenight',
  location: 'my-dms',
  overallFinish: 'Premium, glossy, luxury retail look'
};

/**
 * Constructs the exact high-resolution 9:16 social media flyer design prompt
 */
export function constructFlyerPrompt(fields: FlyerPromptFields): string {
  const offeringsText = fields.offerings && fields.offerings.length > 0
    ? fields.offerings.map(item => `  - ${item.trim()}`).join('\n')
    : '  - Custom Kaftans\n  - Designer Suits\n  - Handcrafted T-shirts';

  return `Generate a high-resolution, professional-grade flyer image suitable for social media.
    **CRITICAL: The final image MUST be in a ${fields.aspectRatio || '9:16'} aspect ratio.** The design should be photorealistic and highly detailed.

    
    The 'Product/Service Visuals' description below provides instructions on what visuals to create from scratch.

    **Core Design Brief:**

    **1. Theme & Branding:**
    - **Concept:** ${fields.concept}
    - **Color Scheme:** ${fields.colorSchemeSummary} 
**Specific Color Palette (Use these Hex codes strictly):**
- Primary Blue: ${fields.primaryBlueHex}
- Silver Accent: ${fields.silverAccentHex}
- Gold Highlight: ${fields.goldHighlightHex}

    **2. Text & Typography:**
    - **Main Title / Brand Name:** "${fields.brandName}"
    - **Typography Style:** ${fields.typographyStyle}
    - **Tagline:** "${fields.tagline}"
    - **IMPORTANT:** All text on the flyer must be legible, well-placed, and artistically integrated into the overall design. Avoid distorted or unreadable text.

    **3. Content & Offerings:**
    
  **Section: "${fields.sectionTitle}"**
${offeringsText}


    **4. Visuals & Display:**
    - **Product/Service Visuals:** ${fields.productVisuals}
    - **Display Arrangement:** ${fields.displayArrangement}
    - **Background:** ${fields.backgroundTexture}
    - **Lighting & Special Effects:** ${fields.lighting}

    
**5. Layout & Contact Details (Stylized representation):**
- **Call to Action:** Create a visually appealing button or prominent shape with the text "${fields.callToAction}".
- **Contact Information:** Include stylized icons and placeholder text for the following details. Ensure they are subtle but readable.
    - Phone: ${fields.phone}
    - Social Media: ${fields.socialMedia}
    - Location: ${fields.location}
- **Footer/Decorative Elements:** Subtle brand accents and social media icons

    **6. Style & Finish:**
    - **Overall Finish:** ${fields.overallFinish}

    The final image must be a polished, cohesive, and visually stunning advertisement for professional use. Pay close attention to detail, lighting, and composition.`;
}

/**
 * Parses an existing prompt to populate FlyerPromptFields.
 * If fields aren't found in the text, it uses smart fallbacks from detected layers or deduced palette.
 */
export function parseFlyerPrompt(
  rawPrompt: string,
  layers: Layer[] = [],
  palette: DeducedPalette | null = null
): FlyerPromptFields {
  const result: FlyerPromptFields = { ...DEFAULT_GLAMOUR_FLYER_FIELDS };

  if (!rawPrompt) return result;

  // Aspect Ratio
  const arMatch = rawPrompt.match(/(\d+:\d+)\s*aspect\s*ratio/i) || rawPrompt.match(/aspect\s*ratio:?\s*(\d+:\d+)/i);
  if (arMatch) result.aspectRatio = arMatch[1];

  // Concept
  const conceptMatch = rawPrompt.match(/[-*]\s*\*\*Concept:\*\*\s*([^\n]+)/i);
  if (conceptMatch) result.concept = conceptMatch[1].trim();

  // Color Scheme Summary
  const colorSchemeMatch = rawPrompt.match(/[-*]\s*\*\*Color Scheme:\*\*\s*([^\n]+)/i);
  if (colorSchemeMatch) result.colorSchemeSummary = colorSchemeMatch[1].trim();

  // Specific Hexes
  const primaryMatch = rawPrompt.match(/Primary (?:Blue|Color):\s*(#[0-9a-fA-F]{6})/i);
  if (primaryMatch) result.primaryBlueHex = primaryMatch[1];

  const silverMatch = rawPrompt.match(/Silver (?:Accent|Color):\s*(#[0-9a-fA-F]{6})/i);
  if (silverMatch) result.silverAccentHex = silverMatch[1];

  const goldMatch = rawPrompt.match(/Gold (?:Highlight|Accent):\s*(#[0-9a-fA-F]{6})/i);
  if (goldMatch) result.goldHighlightHex = goldMatch[1];

  // Main Title / Brand Name
  const brandMatch = rawPrompt.match(/[-*]\s*\*\*Main Title \/ Brand Name:\*\*\s*"([^"]+)"/i) ||
                     rawPrompt.match(/[-*]\s*\*\*Main Title \/ Brand Name:\*\*\s*([^\n]+)/i);
  if (brandMatch) {
    result.brandName = brandMatch[1].replace(/"/g, '').trim();
  }

  // Tagline
  const taglineMatch = rawPrompt.match(/[-*]\s*\*\*Tagline:\*\*\s*"([^"]+)"/i) ||
                       rawPrompt.match(/[-*]\s*\*\*Tagline:\*\*\s*([^\n]+)/i);
  if (taglineMatch) {
    result.tagline = taglineMatch[1].replace(/"/g, '').trim();
  }

  // Typography Style
  const typoMatch = rawPrompt.match(/[-*]\s*\*\*Typography Style:\*\*\s*([^\n]+)/i);
  if (typoMatch) result.typographyStyle = typoMatch[1].trim();

  // Section Name
  const sectionMatch = rawPrompt.match(/\*\*Section:\s*"([^"]+)"\*\*/i) || rawPrompt.match(/\*\*Section:\s*([^\n*]+)\*\*/i);
  if (sectionMatch) result.sectionTitle = sectionMatch[1].replace(/"/g, '').trim();

  // Offerings
  const offeringsBlockMatch = rawPrompt.match(/\*\*Section:[^\n]*\*\*([\s\S]*?)(?=\*\*4\. Visuals)/i);
  if (offeringsBlockMatch) {
    const lines = offeringsBlockMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s*[-*]\s*/, '').trim())
      .filter(l => l.length > 0);
    if (lines.length > 0) {
      result.offerings = lines;
    }
  }

  // Product Visuals
  const visualsMatch = rawPrompt.match(/[-*]\s*\*\*Product\/Service Visuals:\*\*\s*([^\n]+)/i);
  if (visualsMatch) result.productVisuals = visualsMatch[1].trim();

  // Display Arrangement
  const displayMatch = rawPrompt.match(/[-*]\s*\*\*Display Arrangement:\*\*\s*([^\n]+)/i);
  if (displayMatch) result.displayArrangement = displayMatch[1].trim();

  // Background
  const bgMatch = rawPrompt.match(/[-*]\s*\*\*Background:\*\*\s*([^\n]+)/i);
  if (bgMatch) result.backgroundTexture = bgMatch[1].trim();

  // Lighting
  const lightMatch = rawPrompt.match(/[-*]\s*\*\*Lighting & Special Effects:\*\*\s*([^\n]+)/i);
  if (lightMatch) result.lighting = lightMatch[1].trim();

  // Call to Action
  const ctaMatch = rawPrompt.match(/text "([^"]+)"/i);
  if (ctaMatch) result.callToAction = ctaMatch[1].trim();

  // Contacts: Phone, Social, Location
  const phoneMatch = rawPrompt.match(/Phone:\s*([^\n]+)/i);
  if (phoneMatch) result.phone = phoneMatch[1].trim();

  const socialMatch = rawPrompt.match(/Social Media:\s*([^\n]+)/i);
  if (socialMatch) result.socialMedia = socialMatch[1].trim();

  const locMatch = rawPrompt.match(/Location:\s*([^\n]+)/i);
  if (locMatch) result.location = locMatch[1].trim();

  // Overall Finish
  const finishMatch = rawPrompt.match(/[-*]\s*\*\*Overall Finish:\*\*\s*([^\n]+)/i);
  if (finishMatch) result.overallFinish = finishMatch[1].trim();

  // If this wasn't an existing flyer prompt, enhance defaults from detected layers/palette
  const isExistingFlyer = rawPrompt.includes('Core Design Brief') || rawPrompt.includes('Glamour Boutique');
  if (!isExistingFlyer) {
    if (palette && palette.colors && palette.colors.length >= 3) {
      result.primaryBlueHex = palette.colors[0]?.hex || result.primaryBlueHex;
      result.silverAccentHex = palette.colors[1]?.hex || result.silverAccentHex;
      result.goldHighlightHex = palette.colors[2]?.hex || result.goldHighlightHex;
      result.colorSchemeSummary = `${palette.themeName || 'Harmonious'} palette with ${palette.colors[0]?.name || 'deep tone'}, ${palette.colors[1]?.name || 'accent'}, and ${palette.colors[2]?.name || 'highlight'}`;
    }

    const textLayers = layers.filter(l => l.type === LayerType.TEXT || (l.ocr_text && l.ocr_text.trim().length > 0));
    if (textLayers.length > 0 && textLayers[0].ocr_text) {
      result.brandName = textLayers[0].ocr_text.trim();
    }
    if (textLayers.length > 1 && textLayers[1].ocr_text) {
      result.tagline = textLayers[1].ocr_text.trim();
    }

    const objectLayers = layers.filter(l => l.type === LayerType.OBJECT || l.type === LayerType.GRAPHIC_ELEMENT);
    if (objectLayers.length > 0) {
      result.offerings = objectLayers.slice(0, 3).map(l => l.name.replace(/^Detected\s+/i, ''));
    }
  }

  return result;
}
