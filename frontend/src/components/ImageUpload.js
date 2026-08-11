import React from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Camera, Upload, X } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

function ImageUpload({ label, value, onChange, required }) {
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState(value || null);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  const validateFile = (file) => {
    if (!file.type.match('image/(jpeg|jpg|png)')) {
      toast.error('Only JPG and PNG images are allowed');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return false;
    }
    return true;
  };

  const uploadFile = async (file) => {
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = response.data.url;
      setPreview(imageUrl);
      onChange(imageUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-600">*</span>}
        </Label>
      )}

      {preview ? (
        <div className="relative">
          <img
            src={preview.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${preview}` : preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-md border border-zinc-200"
          />
          <Button
            type="button"
            onClick={handleRemove}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center gap-2"
                disabled={uploading}
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Take Photo</span>
              </Button>
            </div>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center gap-2"
                disabled={uploading}
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs">Upload Image</span>
              </Button>
            </div>
          </div>

          {uploading && (
            <div className="text-center text-sm text-zinc-600 py-2">
              Uploading and compressing...
            </div>
          )}

          <p className="text-xs text-zinc-500">
            JPG or PNG • Max 2MB • Auto-compressed
          </p>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
