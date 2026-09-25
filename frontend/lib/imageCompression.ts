// ── Client-side image compression ────────────────────────────────────────────
// Shrinks an image before upload: downscales to `maxWidth` (the backend's
// Cloudinary transform limits to this width anyway, so extra pixels are only
// wasted bandwidth) and re-encodes as high-quality WebP. Falls back to JPEG
// where the browser can't encode WebP, and to the original file whenever the
// result isn't smaller or the browser can't decode the image.

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export interface CompressResult {
  file: File
  originalSize: number
  compressed: boolean
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

export async function compressImage(file: File, options: CompressOptions = {}): Promise<CompressResult> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.85 } = options
  const original: CompressResult = { file, originalSize: file.size, compressed: false }
  if (typeof document === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/gif') return original

  let bitmap: ImageBitmap
  try {
    // Applies EXIF orientation so phone photos aren't rotated
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return original
  }

  try {
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return original
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)

    // Safari returns PNG when it can't encode WebP; retry as JPEG then
    let blob = await toBlob(canvas, 'image/webp', quality)
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality)
    if (!blob || blob.size >= file.size) return original

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${ext}`
    return { file: new File([blob], name, { type: blob.type }), originalSize: file.size, compressed: true }
  } finally {
    bitmap.close()
  }
}

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
