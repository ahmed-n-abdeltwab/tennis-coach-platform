import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from 'react';

import { accountService, isAppError } from '../../services';

// ============================================================================
// Types
// ============================================================================

interface ImageUploaderProps {
  /** Account ID for the image upload */
  accountId: string;
  /** Current profile image URL */
  currentImageUrl?: string;
  /** Callback when image is successfully uploaded */
  onImageUploaded?: (imageUrl: string) => void;
  /** Callback when upload fails */
  onError?: (error: string) => void;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Allowed file types */
  allowedTypes?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates uploaded file
 */
function validateFile(file: File, maxSizeMB: number, allowedTypes: string[]): string | null {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return `File type not supported. Please upload: ${allowedTypes.map(type => type.split('/')[1]).join(', ')}`;
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size too large. Maximum size is ${maxSizeMB}MB`;
  }

  return null;
}

/**
 * Creates a preview URL for the uploaded file
 */
function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Cleans up preview URL
 */
function cleanupPreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// ============================================================================
// ImageUploader Component
// ============================================================================

function ImageUploader({
  accountId,
  currentImageUrl,
  onImageUploaded,
  onError,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles file selection
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file
      const validationError = validateFile(file, maxSizeMB, allowedTypes);
      if (validationError) {
        onError?.(validationError);
        return;
      }

      // Clean up previous preview URL
      if (previewUrl) {
        cleanupPreviewUrl(previewUrl);
      }

      // Set new file and preview
      setSelectedFile(file);
      const newPreviewUrl = createPreviewUrl(file);
      setPreviewUrl(newPreviewUrl);
    },
    [maxSizeMB, allowedTypes, previewUrl, onError]
  );

  /**
   * Handles file input change
   */
  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  /**
   * Handles drag over
   */
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  /**
   * Handles drag leave
   */
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * Handles file drop
   */
  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  /**
   * Opens file selection dialog
   */
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handles image upload
   */
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Convert file to data URL (in a real app, you'd upload to a file storage service first)
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Upload the image URL to the account
      await accountService.uploadProfileImage(accountId, dataUrl);

      onImageUploaded?.(dataUrl);

      // Clean up
      setSelectedFile(null);
      if (previewUrl) {
        cleanupPreviewUrl(previewUrl);
        setPreviewUrl(null);
      }
    } catch (error: unknown) {
      const errorMessage = isAppError(error) ? error.message : 'Failed to upload image';
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, previewUrl, accountId, onImageUploaded, onError]);

  /**
   * Cancels file selection
   */
  const handleCancel = useCallback(() => {
    if (previewUrl) {
      cleanupPreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        cleanupPreviewUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <h2 className='text-2xl font-bold text-gray-900 mb-6'>Profile Image</h2>

      {/* Current/Preview Image */}
      <div className='mb-6'>
        <div className='flex justify-center'>
          <div className='relative'>
            <img
              src={previewUrl ?? currentImageUrl ?? '/default-avatar.png'}
              alt='Profile'
              className='w-32 h-32 rounded-full object-cover border-4 border-gray-200'
            />
            {previewUrl && (
              <div className='absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1'>
                <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
        {previewUrl && <p className='text-center text-sm text-gray-600 mt-2'>New image preview</p>}
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className='hidden'
        />

        <div className='space-y-4'>
          <div className='flex justify-center'>
            <svg
              className='w-12 h-12 text-gray-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
              />
            </svg>
          </div>

          <div>
            <p className='text-lg font-medium text-gray-900'>
              Drop your image here, or{' '}
              <button
                type='button'
                onClick={openFileDialog}
                className='text-orange-500 hover:text-orange-600 font-semibold'
              >
                browse
              </button>
            </p>
            <p className='text-sm text-gray-500 mt-1'>
              Supports: {allowedTypes.map(type => type.split('/')[1]).join(', ')} (max {maxSizeMB}
              MB)
            </p>
          </div>
        </div>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className='mt-4 p-4 bg-gray-50 rounded-lg'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='font-medium text-gray-900'>{selectedFile.name}</p>
              <p className='text-sm text-gray-500'>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <div className='flex space-x-2'>
              <button
                type='button'
                onClick={handleCancel}
                className='px-4 py-2 text-gray-600 hover:text-gray-800 font-medium'
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleUpload}
                disabled={isUploading}
                className='bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors'
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className='mt-4'>
          <div className='bg-gray-200 rounded-full h-2'>
            <div
              className='bg-orange-500 h-2 rounded-full animate-pulse'
              style={{ width: '60%' }}
            ></div>
          </div>
          <p className='text-sm text-gray-600 mt-1 text-center'>Uploading image...</p>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
