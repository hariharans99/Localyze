/**
 * High-Precision Adaptive Image Compression Utilities
 * Uses stepped bicubic downsampling & 2-tier adaptive binary search for exact target size control.
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
    scaleFactor?: number;
}

/**
 * Perform stepped downsampling to avoid aliasing and preserve crisp details
 */
export function steppedDownsample(
    sourceCanvas: HTMLCanvasElement | HTMLImageElement,
    targetWidth: number,
    targetHeight: number
): HTMLCanvasElement {
    let curWidth = sourceCanvas.width;
    let curHeight = sourceCanvas.height;

    // If no downsampling needed, copy to canvas
    if (curWidth === targetWidth && curHeight === targetHeight) {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        }
        return canvas;
    }

    let tempCanvas = document.createElement('canvas');
    tempCanvas.width = curWidth;
    tempCanvas.height = curHeight;
    let tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(sourceCanvas, 0, 0, curWidth, curHeight);
    }

    // Step down by halves if scaling down significantly (> 2x)
    while (curWidth * 0.5 > targetWidth && curHeight * 0.5 > targetHeight) {
        const halfWidth = Math.floor(curWidth * 0.5);
        const halfHeight = Math.floor(curHeight * 0.5);
        const nextCanvas = document.createElement('canvas');
        nextCanvas.width = halfWidth;
        nextCanvas.height = halfHeight;
        const nextCtx = nextCanvas.getContext('2d');
        if (nextCtx) {
            nextCtx.imageSmoothingEnabled = true;
            nextCtx.imageSmoothingQuality = 'high';
            nextCtx.drawImage(tempCanvas, 0, 0, halfWidth, halfHeight);
        }
        tempCanvas = nextCanvas;
        curWidth = halfWidth;
        curHeight = halfHeight;
    }

    // Final scaling step to exact target dimension
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (finalCtx) {
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        finalCtx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
    }

    return finalCanvas;
}

/**
 * Load an image file and draw it to a canvas with crisp smoothing
 */
export async function loadImageToCanvas(
    file: File,
    maxWidth?: number,
    maxHeight?: number,
    preserveDimensions: boolean = false
): Promise<{ canvas: HTMLCanvasElement; originalWidth: number; originalHeight: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl); // Clean up memory immediately

            let targetWidth = img.width;
            let targetHeight = img.height;
            const originalWidth = targetWidth;
            const originalHeight = targetHeight;

            // Compute target bounds if dimension limits are specified
            if (!preserveDimensions) {
                if (maxWidth && targetWidth > maxWidth) {
                    targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
                    targetWidth = maxWidth;
                }
                if (maxHeight && targetHeight > maxHeight) {
                    targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
                    targetHeight = maxHeight;
                }
            }

            const canvas = steppedDownsample(img, targetWidth, targetHeight);
            resolve({ canvas, originalWidth, originalHeight });
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image: ' + err));
        };

        img.src = objectUrl;
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
 * Compress image to target size using high-precision 2-tier adaptive binary search
 */
export async function compressToTargetSize(
    initialCanvas: HTMLCanvasElement,
    targetSizeBytes: number,
    format: string = 'image/jpeg',
    preserveDimensions: boolean = false,
    maxIterations: number = 14,
    onProgress?: (iteration: number, currentSize: number, quality: number) => void
): Promise<{ blob: Blob; quality: number; canvas: HTMLCanvasElement }> {
    let currentCanvas = initialCanvas;

    // Helper: Quality binary search on a fixed canvas
    async function binarySearchQuality(
        canvas: HTMLCanvasElement,
        iterOffset: number = 0
    ): Promise<{ bestBlob: Blob | null; bestQuality: number; smallestBlob: Blob; smallestQuality: number }> {
        let minQuality = 0.01;
        let maxQuality = 1.0;
        let bestBlob: Blob | null = null;
        let bestQuality = minQuality;

        // Start with lowest quality to find absolute minimum floor for this resolution
        const minBlob = await canvasToBlob(canvas, format, minQuality);
        let smallestBlob = minBlob;
        let smallestQuality = minQuality;

        if (minBlob.size <= targetSizeBytes) {
            bestBlob = minBlob;
            bestQuality = minQuality;
        }

        // Test max quality first: if already under budget, use max quality!
        const maxBlob = await canvasToBlob(canvas, format, maxQuality);
        if (maxBlob.size <= targetSizeBytes) {
            return { bestBlob: maxBlob, bestQuality: maxQuality, smallestBlob, smallestQuality };
        }

        // Binary search between minQuality and maxQuality
        for (let i = 0; i < maxIterations; i++) {
            const quality = Number(((minQuality + maxQuality) / 2).toFixed(4));
            const blob = await canvasToBlob(canvas, format, quality);

            if (onProgress) {
                onProgress(iterOffset + i + 1, blob.size, quality);
            }

            if (blob.size < smallestBlob.size) {
                smallestBlob = blob;
                smallestQuality = quality;
            }

            if (blob.size <= targetSizeBytes) {
                bestBlob = blob;
                bestQuality = quality;
                minQuality = quality; // Try higher quality
            } else {
                maxQuality = quality; // Blob too large, reduce quality
            }

            // Tight tolerance: within 0.8% of target without exceeding it
            const diffRatio = (targetSizeBytes - blob.size) / targetSizeBytes;
            if (blob.size <= targetSizeBytes && diffRatio <= 0.008) {
                return { bestBlob: blob, bestQuality: quality, smallestBlob, smallestQuality };
            }
        }

        return { bestBlob, bestQuality, smallestBlob, smallestQuality };
    }

    // Special PNG handling (PNG is lossless and ignores quality parameter)
    if (format === 'image/png') {
        let blob = await canvasToBlob(currentCanvas, format, 1.0);
        if (blob.size <= targetSizeBytes || preserveDimensions) {
            return { blob, quality: 1.0, canvas: currentCanvas };
        }

        // Adaptively downscale PNG dimensions to meet target size
        let scale = Math.sqrt(targetSizeBytes / blob.size) * 0.95;
        for (let pass = 0; pass < 5; pass++) {
            const w = Math.max(32, Math.round(initialCanvas.width * scale));
            const h = Math.max(32, Math.round(initialCanvas.height * scale));
            currentCanvas = steppedDownsample(initialCanvas, w, h);
            blob = await canvasToBlob(currentCanvas, format, 1.0);
            if (blob.size <= targetSizeBytes) {
                return { blob, quality: 1.0, canvas: currentCanvas };
            }
            scale *= 0.85;
        }
        return { blob, quality: 1.0, canvas: currentCanvas };
    }

    // Tier 1: Quality search on initial resolution
    const firstPass = await binarySearchQuality(currentCanvas, 0);
    if (firstPass.bestBlob) {
        return { blob: firstPass.bestBlob, quality: firstPass.bestQuality, canvas: currentCanvas };
    }

    // If preserveDimensions is true, return the lowest achievable size
    if (preserveDimensions) {
        return { blob: firstPass.smallestBlob, quality: firstPass.smallestQuality, canvas: currentCanvas };
    }

    // Tier 2: Adaptive Resolution Downscaling Fallback
    // When image resolution is too high to fit in the target size even at Q=0.01
    let scale = Math.min(0.9, Math.sqrt(targetSizeBytes / firstPass.smallestBlob.size) * 1.05);

    for (let pass = 0; pass < 6; pass++) {
        const nextWidth = Math.max(48, Math.round(initialCanvas.width * scale));
        const nextHeight = Math.max(48, Math.round(initialCanvas.height * scale));

        currentCanvas = steppedDownsample(initialCanvas, nextWidth, nextHeight);

        const subPass = await binarySearchQuality(currentCanvas, (pass + 1) * maxIterations);
        if (subPass.bestBlob) {
            return { blob: subPass.bestBlob, quality: subPass.bestQuality, canvas: currentCanvas };
        }

        // Shrink further
        scale *= 0.8;
    }

    // Fallback: lowest size found
    const finalBlob = await canvasToBlob(currentCanvas, format, 0.01);
    return { blob: finalBlob, quality: 0.01, canvas: currentCanvas };
}

/**
 * Main compression function
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
        maxIterations = 14
    } = options;

    // Load image to canvas with stepped downsampling if needed
    const { canvas: initialCanvas } = await loadImageToCanvas(
        file,
        maxWidth,
        maxHeight,
        preserveDimensions
    );

    const targetSizeBytes = targetSizeKB * 1024;

    // Compress to exact target size
    const { blob, quality, canvas: finalCanvas } = await compressToTargetSize(
        initialCanvas,
        targetSizeBytes,
        format,
        preserveDimensions,
        maxIterations,
        onProgress
    );

    const compressionRatio = file.size / blob.size;

    return {
        blob,
        quality,
        compressionRatio,
        originalSize: file.size,
        compressedSize: blob.size,
        dimensions: {
            width: finalCanvas.width,
            height: finalCanvas.height
        }
    };
}
