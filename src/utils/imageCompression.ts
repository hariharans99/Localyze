/**
 * Custom Image Compression Utilities
 * Uses Canvas API with binary search algorithm for precise file size control
 */

export interface CompressionOptions {
    targetSizeKB: number;
    format: 'image/jpeg' | 'image/webp' | 'image/png';
    maxWidth?: number;
    maxHeight?: number;
    preserveDimensions?: boolean;
    maxIterations?: number;
}

export interface CompressionResult {
    blob: Blob;
    quality: number;
    compressionRatio: number;
    originalSize: number;
    compressedSize: number;
    dimensions: { width: number; height: number };
}

/**
 * Load an image file and draw it to a canvas
 */
export async function loadImageToCanvas(
    file: File,
    maxWidth?: number,
    maxHeight?: number,
    preserveDimensions: boolean = false
): Promise<{ canvas: HTMLCanvasElement; originalWidth: number; originalHeight: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const originalWidth = width;
            const originalHeight = height;

            // Resize if needed and not preserving dimensions
            if (!preserveDimensions) {
                if (maxWidth && width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (maxHeight && height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Failed to get canvas context'));
            }

            // High quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);

            resolve({ canvas, originalWidth, originalHeight });
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Convert canvas to blob with specified format and quality
 */
export function canvasToBlob(
    canvas: HTMLCanvasElement,
    format: string,
    quality: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            },
            format,
            quality
        );
    });
}

/**
 * Compress image to target size using binary search on quality parameter
 */
export async function compressToTargetSize(
    canvas: HTMLCanvasElement,
    targetSizeBytes: number,
    format: string = 'image/jpeg',
    maxIterations: number = 15,
    onProgress?: (iteration: number, currentSize: number, quality: number) => void
): Promise<{ blob: Blob; quality: number }> {
    let minQuality = 0.1;
    let maxQuality = 1.0;
    let bestBlob: Blob | null = null;
    let bestQuality = minQuality;

    // For PNG, quality doesn't matter (lossless)
    if (format === 'image/png') {
        const blob = await canvasToBlob(canvas, format, 1.0);
        return { blob, quality: 1.0 };
    }

    // Binary search for optimal quality
    for (let i = 0; i < maxIterations; i++) {
        const quality = (minQuality + maxQuality) / 2;
        const blob = await canvasToBlob(canvas, format, quality);

        if (onProgress) {
            onProgress(i + 1, blob.size, quality);
        }

        // If blob is smaller than or equal to target, save it and try higher quality
        if (blob.size <= targetSizeBytes) {
            bestBlob = blob;
            bestQuality = quality;
            minQuality = quality; // Try higher quality
        } else {
            // Blob is too large, try lower quality
            maxQuality = quality;
        }

        // If we're within 5% of target, that's good enough
        const percentDiff = Math.abs(blob.size - targetSizeBytes) / targetSizeBytes;
        if (percentDiff < 0.05 && blob.size <= targetSizeBytes) {
            return { blob, quality };
        }
    }

    // If we didn't find a perfect match, return the best one we found
    if (bestBlob) {
        return { blob: bestBlob, quality: bestQuality };
    }

    // Fallback: use minimum quality
    const fallbackBlob = await canvasToBlob(canvas, format, minQuality);
    return { blob: fallbackBlob, quality: minQuality };
}

/**
 * Main compression function - combines all steps
 */
export async function compressImage(
    file: File,
    options: CompressionOptions,
    onProgress?: (iteration: number, currentSize: number, quality: number) => void
): Promise<CompressionResult> {
    const {
        targetSizeKB,
        format,
        maxWidth,
        maxHeight,
        preserveDimensions = false,
        maxIterations = 15
    } = options;

    // Load image to canvas
    const { canvas } = await loadImageToCanvas(
        file,
        maxWidth,
        maxHeight,
        preserveDimensions
    );

    const targetSizeBytes = targetSizeKB * 1024;

    // Compress to target size
    const { blob, quality } = await compressToTargetSize(
        canvas,
        targetSizeBytes,
        format,
        maxIterations,
        onProgress
    );

    // Calculate results
    const compressionRatio = file.size / blob.size;

    return {
        blob,
        quality,
        compressionRatio,
        originalSize: file.size,
        compressedSize: blob.size,
        dimensions: {
            width: canvas.width,
            height: canvas.height
        }
    };
}
