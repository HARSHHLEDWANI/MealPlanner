import { Request, Response } from 'express';
import { visionService } from '../services/visionService';
import { actingUserId } from '../middleware/auth';
import { refundQuota } from '../middleware/quota';

export class ImageController {
  /**
   * Identifies ingredients in an uploaded photo.
   *
   * This was a stub returning `{ message: 'Image analysis endpoint' }`, and its
   * router was never even mounted on the app.
   */
  analyzeImage = async (req: Request, res: Response) => {
    // Not used for the lookup, but calling it asserts the request is
    // authenticated before spending a vision call.
    actingUserId(req);

    const { image } = req.body as { image: string };

    let ingredients;
    try {
      ingredients = await visionService.detectIngredients(image);
    } catch (error) {
      // A rejected image or a failed vision call cost nothing to bill for.
      await refundQuota(req);
      throw error;
    }

    res.json({ ingredients });
  };
}
