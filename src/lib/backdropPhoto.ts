/**
 * The uploaded backdrop photo (prototype-v7 loadCustomBackdrop / setCustomBackdropFromFile).
 * A plain module, not store state: the renderer reads it with `getCustomBackdrop()` and React
 * subscribes with `subscribeCustomBackdrop`. The photo is kept as a downsized JPEG data URL in
 * localStorage, separate from the saved terrarium.
 */

export const BACKDROP_IMG_KEY = 'botanica_backdrop_photo_v1'
export const NOT_AN_IMAGE = 'Choose an image file (JPG, PNG or WebP)'
const UNREADABLE = 'Could not read that image'
const MAX_SIDE = 1600
const JPEG_QUALITY = 0.86

let customImg: HTMLImageElement | null = null
let revision = 0
const listeners = new Set<() => void>()

export function getCustomBackdrop(): HTMLImageElement | null {
  return customImg
}

/**
 * Bumps every time a photo is published. The renderer keys its painted-scene cache on this, so a
 * replaced photo is always repainted (two photos can share a data URL length).
 */
export function getCustomBackdropRevision(): number {
  return revision
}

/** Calls `cb` whenever the photo changes; returns the unsubscribe function. */
export function subscribeCustomBackdrop(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function publish(img: HTMLImageElement): void {
  customImg = img
  revision++
  listeners.forEach((cb) => cb())
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(UNREADABLE))
    img.src = src
  })
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(UNREADABLE))
    reader.onerror = () => reject(new Error(UNREADABLE))
    reader.readAsDataURL(file)
  })
}

/** Restores the photo saved by an earlier upload; null when there is none or storage is blocked. */
export async function loadCustomBackdrop(): Promise<HTMLImageElement | null> {
  let data: string | null = null
  try {
    data = localStorage.getItem(BACKDROP_IMG_KEY)
  } catch {
    return null // storage unavailable
  }
  if (!data) return null
  try {
    const img = await decodeImage(data)
    publish(img)
    return img
  } catch {
    return null
  }
}

/**
 * Makes `file` the backdrop photo: downsized to at most 1600 px on its long side, re-encoded as
 * JPEG and remembered in localStorage when it fits. Rejects with a toast-ready message when the
 * file is not an image or cannot be decoded. Resolves with the photo and the toast to show.
 */
export async function setCustomBackdropFromFile(
  file: File,
): Promise<{ img: HTMLImageElement; toast: string }> {
  if (!file || !file.type.startsWith('image/')) throw new Error(NOT_AN_IMAGE)
  const raw = await decodeImage(await readAsDataURL(file))
  // Downscale so it stays light in storage
  const sc = Math.min(1, MAX_SIDE / Math.max(raw.width, raw.height))
  const c = document.createElement('canvas')
  c.width = Math.round(raw.width * sc)
  c.height = Math.round(raw.height * sc)
  const g = c.getContext('2d')
  if (!g) throw new Error(UNREADABLE)
  g.drawImage(raw, 0, 0, c.width, c.height)
  const data = c.toDataURL('image/jpeg', JPEG_QUALITY)
  let toast = 'Your photo is now the backdrop'
  try {
    localStorage.setItem(BACKDROP_IMG_KEY, data)
  } catch {
    toast = 'Backdrop set; it is too large to remember after reload'
  }
  const img = await decodeImage(data)
  publish(img)
  return { img, toast }
}
