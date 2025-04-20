import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const ImageRecognition: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setImage(imageDataUrl);
      stopCamera();
    }
  };

  // Process the image
  const processImage = async () => {
    if (!image) return;

    setIsProcessing(true);
    try {
      // TODO: Implement image processing logic with OpenAI Vision API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated delay
      navigate('/recipes', { state: { ingredients: ['tomato', 'onion', 'garlic'] } }); // Example result
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-3xl font-bold mb-8">Snap & Cook</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          {!image && !isCameraActive && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors"
              >
                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                <span className="text-sm text-gray-600">Upload Image</span>
              </button>
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors"
              >
                <Camera className="w-8 h-8 mb-2 text-gray-500" />
                <span className="text-sm text-gray-600">Take Photo</span>
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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                <button
                  onClick={captureImage}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {image && (
            <div className="relative">
              <img src={image} alt="Selected" className="w-full rounded-lg" />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 p-1 bg-gray-800/50 text-white rounded-full hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {image && !isProcessing && (
            <button
              onClick={processImage}
              className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Process Image
            </button>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center mt-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2">Processing image...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ImageRecognition;