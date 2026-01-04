'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Paper,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { optimizeImage, validateImage, uploadImageToStorage, deleteImageFromStorage } from '../utils/imageOptimization';
import { supabase } from '../../lib/supabase';

interface ImageUploadProps {
  images: string[];
  maxImages?: number;
  centerId?: string;
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

export default function ImageUpload({
  images = [],
  maxImages = 3,
  centerId,
  onChange,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState<number | null>(null); // Index of image being uploaded
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    // Check if we can add more images
    if (images.length >= maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const file = files[0];
    
    // Validate file
    const validation = validateImage(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    // If centerId exists, upload immediately; otherwise, use data URL for preview
    if (centerId) {
      try {
        setUploading(images.length);
        const imageUrl = await uploadImageToStorage(file, centerId, images.length);
        onChange([...images, imageUrl]);
      } catch (err: any) {
        setError(err.message || 'Failed to upload image');
      } finally {
        setUploading(null);
      }
    } else {
      // For new centers, use data URL as placeholder
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onChange([...images, dataUrl]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (index: number) => {
    const imageUrl = images[index];
    
    // Delete from storage if it's a URL (not a data URL)
    if (imageUrl && imageUrl.startsWith('http')) {
      try {
        await deleteImageFromStorage(imageUrl);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }
    
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleClick = () => {
    if (!disabled && images.length < maxImages) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
        Center Images (Max {maxImages})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload up to {maxImages} images for the center slideshow. Images will be automatically optimized.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        {/* Existing Images */}
        {images.map((imageUrl, index) => (
          <Paper
            key={index}
            elevation={2}
            sx={{
              position: 'relative',
              width: 150,
              height: 150,
              overflow: 'hidden',
              borderRadius: 2,
            }}
          >
            <Box
              component="img"
              src={imageUrl}
              alt={`Center image ${index + 1}`}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {!disabled && (
              <IconButton
                size="small"
                onClick={() => handleRemove(index)}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            {uploading === index && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                }}
              >
                <CircularProgress size={32} sx={{ color: 'white' }} />
              </Box>
            )}
          </Paper>
        ))}

        {/* Upload Button */}
        {!disabled && images.length < maxImages && (
          <Paper
            elevation={2}
            sx={{
              width: 150,
              height: 150,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
            onClick={handleClick}
          >
            {uploading !== null && uploading >= images.length ? (
              <CircularProgress size={32} />
            ) : (
              <>
                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="caption" color="text.secondary" align="center" sx={{ px: 1 }}>
                  Upload Image
                </Typography>
              </>
            )}
          </Paper>
        )}
      </Stack>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </Box>
  );
}

