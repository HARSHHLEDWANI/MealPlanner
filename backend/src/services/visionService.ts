import { model } from '../lib/gemini';
import { upstreamFailure, badRequest } from '../lib/errors';

export interface DetectedIngredient {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  quantity?: string;
}

/** Image types Gemini accepts and that a browser camera or file picker produces. */
const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Splits a data URL into its MIME type and base64 payload.
 *
 * The client sends canvas.toDataURL() or a FileReader result, both of which
 * are `data:<mime>;base64,<payload>`. A bare base64 string is accepted too and
 * assumed to be JPEG, which is what the camera capture produces.
 */
function parseImagePayload(image: string): { mimeType: string; data: string } {
  // [\s\S] rather than . with the s flag, which requires an ES2018 target.
  const match = image.match(/^data:([^;,]+);base64,([\s\S]+)$/);

  if (!match) {
    if (/^[A-Za-z0-9+/]+=*$/.test(image.slice(0, 100))) {
      return { mimeType: 'image/jpeg', data: image };
    }
    throw badRequest('Image must be a base64 data URL');
  }

  const [, mimeType, data] = match;

  if (!SUPPORTED_MIME.includes(mimeType.toLowerCase())) {
    throw badRequest(
      `Unsupported image type ${mimeType}. Use JPEG, PNG, WebP or HEIC.`
    );
  }

  return { mimeType: mimeType.toLowerCase(), data };
}

class VisionService {
  /** Same layered extraction the recipe prompts use — models drift on formatting. */
  private extractJSON(text: string): any {
    const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (fenced) return JSON.parse(fenced[1]);

    const bare = text.match(/\{[\s\S]*\}/);
    if (bare) return JSON.parse(bare[0]);

    return JSON.parse(text);
  }

  /**
   * Identifies food ingredients in a photo.
   *
   * Replaces a client-side stub that waited two seconds and returned a
   * hardcoded ['tomato', 'onion', 'garlic'] regardless of the image.
   *
   * The prompt is deliberately conservative about guessing: a shopping list
   * built from a hallucinated ingredient is worse than a short list, so the
   * model is told to report only what it can actually see and to mark its
   * confidence rather than padding the result.
   */
  async detectIngredients(image: string): Promise<DetectedIngredient[]> {
    const { mimeType, data } = parseImagePayload(image);

    const prompt = `You are a food identification assistant. Examine this photograph and list the edible ingredients you can actually see.

RULES:
- Only list items you can genuinely identify in the image. Do not guess or pad the list with items that are merely plausible.
- Name each ingredient in its simplest common form ("tomato", not "three ripe vine tomatoes").
- Do not list cookware, utensils, packaging, surfaces, or people.
- If the image contains no identifiable food at all, return an empty array.
- Set confidence to "high" only when the item is clearly and unambiguously visible.
- Include an approximate quantity only when it is genuinely apparent from the image.

Return ONLY valid JSON (no markdown, no explanations) with this exact structure:
{
  "ingredients": [
    { "name": "tomato", "confidence": "high", "quantity": "3" },
    { "name": "onion", "confidence": "medium" }
  ]
}`;

    let responseText: string;
    try {
      const result = await model.generateContent([
        { inlineData: { mimeType, data } },
        { text: prompt },
      ]);
      responseText = result.response.text();
    } catch (error) {
      console.error('Gemini vision call failed:', error);
      throw upstreamFailure('Could not analyze the image. Please try again.');
    }

    let parsed: any;
    try {
      parsed = this.extractJSON(responseText);
    } catch (error) {
      console.error('Could not parse vision response:', responseText.slice(0, 500));
      throw upstreamFailure('The image analysis returned an unreadable result. Please try again.');
    }

    if (!parsed || !Array.isArray(parsed.ingredients)) {
      throw upstreamFailure('The image analysis returned an unexpected result. Please try again.');
    }

    // Normalize and drop anything malformed rather than trusting the model's
    // shape — a bad entry here would flow straight into a shopping list.
    return parsed.ingredients
      .filter((item: unknown): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object'
      )
      .map((item: Record<string, unknown>) => ({
        name: String(item.name ?? '').trim().toLowerCase(),
        confidence:
          item.confidence === 'high' || item.confidence === 'low' ? item.confidence : 'medium',
        quantity:
          typeof item.quantity === 'string' && item.quantity.trim()
            ? item.quantity.trim()
            : undefined,
      }))
      .filter((item: DetectedIngredient) => item.name.length > 0 && item.name.length < 60)
      .slice(0, 30);
  }
}

export const visionService = new VisionService();
