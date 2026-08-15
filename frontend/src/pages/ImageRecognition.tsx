import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '@/lib/api';
import type { DetectedIngredient } from '@/types';
import { Badge, Button, Card, ErrorBanner, PageHeader, Spinner } from '@/components/ui';
import { QuotaExhausted, UsageMeter } from '@/components/ai/UsageMeter';
import { handleQuotaError, useUsageStore } from '@/store/usageStore';

/**
 * Snap & Cook — photograph ingredients and find recipes that use them.
 *
 * This screen used to be a facade: the camera and upload worked, but
 * processImage() waited two seconds and returned a hardcoded
 * ['tomato', 'onion', 'garlic'] no matter what was photographed. It now posts
 * the image to /api/images/analyze, which runs it through Gemini vision.
 */
const ImageRecognition = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedIngredient[] | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const exhausted = useUsageStore((state) => state.exhausted);
  const refreshUsage = useUsageStore((state) => state.refresh);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Release the camera if the user navigates away mid-capture; otherwise the
  // recording indicator stays on and the device stays held.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const reset = () => {
    setImage(null);
    setDetected(null);
    setError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('That file is not an image. Choose a photo instead.');
      return;
    }

    // The API caps the payload at 8MB of base64, which is roughly 6MB of file.
    if (file.size > 6 * 1024 * 1024) {
      setError('That image is larger than 6MB. Try a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      reset();
      setImage(reader.result as string);
    };
    reader.onerror = () => setError('Could not read that file. Try another photo.');
    reader.readAsDataURL(file);

    // Clear the input so picking the same file twice still fires onChange.
    event.target.value = '';
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Prefer the rear camera on phones, where the ingredients actually are.
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch {
      setError('Could not access the camera. Check permissions, or upload a photo instead.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  };

  const captureImage = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    reset();
    // 0.85 keeps the photo well under the size cap without visible artifacts.
    setImage(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
  };

  const processImage = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);
    try {
      const { data } = await api.post<{ ingredients: DetectedIngredient[] }>(
        '/api/images/analyze',
        { image }
      );

      if (data.ingredients.length === 0) {
        setError('No ingredients were recognized in that photo. Try a clearer, closer shot.');
        setDetected([]);
        return;
      }

      setDetected(data.ingredients);
      refreshUsage();
    } catch (err) {
      // Quota exhaustion renders its own explanation instead of an error.
      if (!handleQuotaError(err)) setError(errorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const findRecipes = () => {
    if (!detected?.length) return;
    navigate('/leftover-magic', {
      state: { ingredients: detected.map((item) => item.name) },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <PageHeader
          title="Snap &amp; Cook"
          description="Photograph what is in your fridge and we will identify the ingredients."
        />

        <Card className="p-6">
          {!image && !isCameraActive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-300 rounded-lg hover:border-primary-500 transition-colors"
              >
                <Upload className="w-8 h-8 mb-2 text-neutral-500" />
                <span className="text-sm text-neutral-600">Upload Image</span>
              </button>
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-300 rounded-lg hover:border-primary-500 transition-colors"
              >
                <Camera className="w-8 h-8 mb-2 text-neutral-500" />
                <span className="text-sm text-neutral-600">Take Photo</span>
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {isCameraActive && (
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                <Button onClick={captureImage}>Capture</Button>
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {image && (
            <div className="relative">
              <img src={image} alt="Selected ingredients" className="w-full rounded-lg" />
              <button
                onClick={reset}
                aria-label="Remove image"
                className="absolute top-2 right-2 p-1 bg-neutral-900/60 text-white rounded-full hover:bg-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <ErrorBanner message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {detected && detected.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display font-semibold mb-3">Ingredients found</h2>
              <ul className="flex flex-wrap gap-2 mb-4">
                {detected.map((item) => (
                  <li key={item.name}>
                    <Badge tone="primary">
                      {item.name}
                      {item.quantity && (
                        <span className="text-primary-600 ml-1">({item.quantity})</span>
                      )}
                      {/* The model is told to mark uncertainty rather than
                          guess; surface that so the user can drop a wrong
                          item before it reaches a shopping list. */}
                      {item.confidence !== 'high' && (
                        <span className="text-neutral-500 ml-1">· unsure</span>
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
              <Button onClick={findRecipes} fullWidth>
                Find recipes with these
              </Button>
            </div>
          )}

          {image && !isProcessing && !detected && (
            <div className="mt-4 space-y-3">
              {exhausted && <QuotaExhausted />}
              <Button onClick={processImage} fullWidth disabled={exhausted}>
                Identify ingredients
              </Button>
              <UsageMeter />
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center mt-4 text-neutral-600 gap-2">
              <Spinner />
              <span>Analyzing photo…</span>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default ImageRecognition;
