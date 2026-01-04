/**
 * Image Optimization Utilities
 * Optimizes images before upload to improve performance
 */

import { supabase } from '../../lib/supabase';

const MAX_IMAGE_SIZE = 1920; // Max width/height in pixels
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max file size
const QUALITY = 0.85; // JPEG quality (0-1)

/**
 * Resize and compress image
 */
export async function optimizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        // Scale down if too large
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            // Create new File from blob
            const optimizedFile = new File(
              [blob],
              file.name,
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            
            resolve(optimizedFile);
          },
          'image/jpeg',
          QUALITY
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
    };
  }
  
  // Check file size (before optimization)
  if (file.size > MAX_FILE_SIZE * 2) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    };
  }
  
  return { valid: true };
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImageToStorage(
  file: File,
  centerId: string,
  imageIndex: number
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Optimize image first
  const optimizedFile = await optimizeImage(file);
  
  // Generate unique filename
  const fileExt = optimizedFile.name.split('.').pop();
  const fileName = `${centerId}/${imageIndex}_${Date.now()}.${fileExt}`;
  const filePath = `center-images/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('center-images')
    .upload(filePath, optimizedFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('center-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/center-images/');
    if (urlParts.length < 2) {
      console.warn('Could not extract file path from URL:', imageUrl);
      return;
    }
    
    const filePath = `center-images/${urlParts[1]}`;
    
    const { error } = await supabase.storage
      .from('center-images')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      // Don't throw - deletion is not critical
    }
  } catch (error) {
    console.error('Error in deleteImageFromStorage:', error);
    // Don't throw - deletion is not critical
  }
}

