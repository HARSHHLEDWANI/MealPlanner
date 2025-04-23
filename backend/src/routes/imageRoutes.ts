import { Router } from 'express';
import { ImageController } from '../controllers/imageController';

const router = Router();
const imageController = new ImageController();

// Image routes
router.post('/analyze', imageController.analyzeImage);
router.post('/upload', imageController.uploadImage);

export { router as imageRoutes }; 