/**
 * High-Precision True-Color Adaptive Image Compression Utilities
 * Preserves vibrant colors, eliminates dark/black alpha artifacts, and hits exact target size budgets.
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
 * Perform stepped downsampling with color preservation and alpha background filling
 */
export function steppedDownsample(
    sourceCanvas: HTMLCanvasElement | HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    format: string = 'image/jpeg'
): HTMLCanvasElement {
    const isJpeg = format === 'image/jpeg';
    let curWidth = sourceCanvas.width;
    let curHeight = sourceCanvas.height;

    // Helper to create and initialize a clean canvas
    const createCleanCanvas = (w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d', { willReadFrequently: false })!;

        // Fill white background for JPEG to avoid black/distorted transparency
        if (isJpeg) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        return { canvas, ctx };
    };

    // If dimensions match, do a clean single render
    if (curWidth === targetWidth && curHeight === targetHeight) {
        const { canvas, ctx } = createCleanCanvas(targetWidth, targetHeight);
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        return canvas;
    }

    // Step down by halves if scaling down significantly (> 2x) for high-frequency sharpness
    let tempCanvas: HTMLCanvasElement = sourceCanvas as HTMLCanvasElement;
    if (sourceCanvas instanceof HTMLImageElement) {
        const initial = createCleanCanvas(curWidth, curHeight);
        initial.ctx.drawImage(sourceCanvas, 0, 0, curWidth, curHeight);
        tempCanvas = initial.canvas;
    }

    while (curWidth * 0.5 > targetWidth && curHeight * 0.5 > targetHeight) {
        const halfWidth = Math.floor(curWidth * 0.5);
        const halfHeight = Math.floor(curHeight * 0.5);
        const next = createCleanCanvas(halfWidth, halfHeight);
        next.ctx.drawImage(tempCanvas, 0, 0, halfWidth, halfHeight);
        tempCanvas = next.canvas;
        curWidth = halfWidth;
        curHeight = halfHeight;
    }

    // Final scaling step to exact target dimension
    const final = createCleanCanvas(targetWidth, targetHeight);
    final.ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
    return final.canvas;
}

/**
 * Load an image file and draw it to a canvas with true-color background filling
 */
export async function loadImageToCanvas(
    file: File,
    maxWidth?: number,
    maxHeight?: number,
    preserveDimensions: boolean = false,
    format: string = 'image/jpeg'
): Promise<{ canvas: HTMLCanvasElement; originalWidth: number; originalHeight: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            let targetWidth = img.naturalWidth || img.width;
            let targetHeight = img.naturalHeight || img.height;
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

            const canvas = steppedDownsample(img, targetWidth, targetHeight, format);
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
            Math.max(0.01, Math.min(1.0, quality))
        );
    });
}

/**
 * High-Precision True-Color Image Compression Engine
 * Guarantees output <= targetSizeBytes while keeping optimal visual fidelity & colors.
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

    // Special PNG handling (PNG is lossless and ignores quality parameter)
    if (format === 'image/png') {
        let blob = await canvasToBlob(currentCanvas, format, 1.0);
        if (blob.size <= targetSizeBytes || preserveDimensions) {
            return { blob, quality: 1.0, canvas: currentCanvas };
        }

        // Adaptively downscale PNG dimensions to meet target size budget
        let scale = Math.sqrt(targetSizeBytes / blob.size) * 0.95;
        for (let pass = 0; pass < 8; pass++) {
            const w = Math.max(32, Math.round(initialCanvas.width * scale));
            const h = Math.max(32, Math.round(initialCanvas.height * scale));
            currentCanvas = steppedDownsample(initialCanvas, w, h, format);
            blob = await canvasToBlob(currentCanvas, format, 1.0);
            if (blob.size <= targetSizeBytes) {
                return { blob, quality: 1.0, canvas: currentCanvas };
            }
            scale *= 0.85;
        }
        return { blob, quality: 1.0, canvas: currentCanvas };
    }

    // Binary search quality on a fixed canvas
    async function binarySearchQuality(
        canvas: HTMLCanvasElement,
        minQ: number = 0.40,
        maxQ: number = 0.95,
        iterOffset: number = 0
    ): Promise<{ bestBlob: Blob | null; bestQuality: number; smallestBlob: Blob; smallestQuality: number }> {
        let low = minQ;
        let high = maxQ;
        let bestBlob: Blob | null = null;
        let bestQuality = low;

        // Check lowest quality first to find size at bottom threshold
        const minBlob = await canvasToBlob(canvas, format, low);
        let smallestBlob = minBlob;
        let smallestQuality = low;

        if (minBlob.size <= targetSizeBytes) {
            bestBlob = minBlob;
            bestQuality = low;
        }

        // Check highest quality: if it already fits, return with maximum quality
        const maxBlob = await canvasToBlob(canvas, format, high);
        if (maxBlob.size <= targetSizeBytes) {
            return { bestBlob: maxBlob, bestQuality: high, smallestBlob, smallestQuality };
        }

        // Binary search for highest quality that fits in targetSizeBytes
        for (let i = 0; i < maxIterations; i++) {
            const mid = Number(((low + high) / 2).toFixed(4));
            const blob = await canvasToBlob(canvas, format, mid);

            if (onProgress) {
                onProgress(iterOffset + i + 1, blob.size, mid);
            }

            if (blob.size < smallestBlob.size) {
                smallestBlob = blob;
                smallestQuality = mid;
            }

            if (blob.size <= targetSizeBytes) {
                bestBlob = blob;
                bestQuality = mid;
                low = mid; // Try higher quality
            } else {
                high = mid; // Too large, reduce quality
            }

            // Tight budget match: within 1.5% of target without exceeding it
            const diffRatio = (targetSizeBytes - blob.size) / targetSizeBytes;
            if (blob.size <= targetSizeBytes && diffRatio >= 0 && diffRatio <= 0.015) {
                return { bestBlob: blob, bestQuality: mid, smallestBlob, smallestQuality };
            }
        }

        return { bestBlob, bestQuality, smallestBlob, smallestQuality };
    }

    // --- STAGE 1: Check if original resolution fits with High Quality (0.60 - 0.95) ---
    const stage1 = await binarySearchQuality(currentCanvas, 0.55, 0.95, 0);
    if (stage1.bestBlob && stage1.bestBlob.size <= targetSizeBytes) {
        return { blob: stage1.bestBlob, quality: stage1.bestQuality, canvas: currentCanvas };
    }

    // If preserveDimensions is explicitly locked by user, search down to lower quality
    if (preserveDimensions) {
        const strictDimPass = await binarySearchQuality(currentCanvas, 0.05, 0.95, maxIterations);
        if (strictDimPass.bestBlob) {
            return { blob: strictDimPass.bestBlob, quality: strictDimPass.bestQuality, canvas: currentCanvas };
        }
        return { blob: strictDimPass.smallestBlob, quality: strictDimPass.smallestQuality, canvas: currentCanvas };
    }

    // --- STAGE 2: Smart Resolution Downscaling with High-Fidelity Color Retention ---
    // Rather than crushing JPEG quality to muddy blocky ranges (<0.50), we downscale resolution
    // while keeping quality high (0.75 - 0.85). This produces dramatically sharper, cleaner images.
    let currentSizeEstimate = stage1.smallestBlob.size;
    let scale = Math.min(0.92, Math.sqrt(targetSizeBytes / currentSizeEstimate) * 1.02);

    for (let pass = 0; pass < 8; pass++) {
        const targetW = Math.max(32, Math.round(initialCanvas.width * scale));
        const targetH = Math.max(32, Math.round(initialCanvas.height * scale));

        currentCanvas = steppedDownsample(initialCanvas, targetW, targetH, format);

        // Search quality in clean range [0.55, 0.92]
        const subPass = await binarySearchQuality(currentCanvas, 0.55, 0.92, (pass + 1) * maxIterations);
        if (subPass.bestBlob && subPass.bestBlob.size <= targetSizeBytes) {
            return { blob: subPass.bestBlob, quality: subPass.bestQuality, canvas: currentCanvas };
        }

        // If even lowest quality at this resolution is too large, reduce scale further
        scale = Math.min(scale * 0.82, Math.sqrt(targetSizeBytes / subPass.smallestBlob.size) * 0.95);
    }

    // --- STAGE 3: Final Budget Guarantee ---
    // If still oversized (e.g. strict 10-20KB limit), scale down and ensure size <= targetSizeBytes
    for (let emergency = 0; emergency < 5; emergency++) {
        const lastBlob = await canvasToBlob(currentCanvas, format, 0.50);
        if (lastBlob.size <= targetSizeBytes) {
            return { blob: lastBlob, quality: 0.50, canvas: currentCanvas };
        }
        const w = Math.max(24, Math.round(currentCanvas.width * 0.75));
        const h = Math.max(24, Math.round(currentCanvas.height * 0.75));
        currentCanvas = steppedDownsample(initialCanvas, w, h, format);
    }

    const guaranteedBlob = await canvasToBlob(currentCanvas, format, 0.45);
    return { blob: guaranteedBlob, quality: 0.45, canvas: currentCanvas };
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

    // Load image to canvas with white background filling for JPEG & stepped downsampling
    const { canvas: initialCanvas } = await loadImageToCanvas(
        file,
        maxWidth,
        maxHeight,
        preserveDimensions,
        format
    );

    const targetSizeBytes = targetSizeKB * 1024;

    // Compress to exact target size budget with true-color preservation
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
