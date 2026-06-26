/**
 * Compress an image file to a JPEG Blob with a max width of `maxWidth` px,
 * drawn via canvas. Keeps aspect ratio. Falls back to the original file if
 * anything goes wrong (e.g. unsupported format).
 */
export async function compressImage(file: File, maxWidth = 1080, quality = 0.8): Promise<Blob> {
  try {
    const bitmap = await loadBitmap(file)
    const scale = Math.min(1, maxWidth / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    return blob ?? file
  } catch {
    return file
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through to <img> loader
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/**
 * Best-effort EXIF DateTimeOriginal reader for JPEG files. Returns an ISO date
 * string (yyyy-mm-dd) or null if not found. No external dependency — parses the
 * APP1/TIFF block directly.
 */
export async function readExifDate(file: File): Promise<string | null> {
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) return null
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer()
    const view = new DataView(buf)
    if (view.getUint16(0) !== 0xffd8) return null // not a JPEG

    let offset = 2
    const len = view.byteLength
    while (offset + 4 < len) {
      if (view.getUint8(offset) !== 0xff) break
      const marker = view.getUint8(offset + 1)
      const size = view.getUint16(offset + 2)
      if (marker === 0xe1) {
        // APP1 — check for "Exif\0\0"
        const exifStart = offset + 4
        if (
          view.getUint32(exifStart) === 0x45786966 &&
          view.getUint16(exifStart + 4) === 0x0000
        ) {
          return parseExifDate(view, exifStart + 6)
        }
      }
      offset += 2 + size
    }
    return null
  } catch {
    return null
  }
}

function parseExifDate(view: DataView, tiffStart: number): string | null {
  const little = view.getUint16(tiffStart) === 0x4949
  const get16 = (o: number) => view.getUint16(o, little)
  const get32 = (o: number) => view.getUint32(o, little)

  const ifd0 = tiffStart + get32(tiffStart + 4)
  const findDate = (ifdOffset: number): string | null => {
    const count = get16(ifdOffset)
    for (let i = 0; i < count; i++) {
      const entry = ifdOffset + 2 + i * 12
      const tag = get16(entry)
      // 0x9003 DateTimeOriginal, 0x0132 DateTime, 0x9004 DateTimeDigitized
      if (tag === 0x9003 || tag === 0x9004 || tag === 0x0132) {
        const valOffset = tiffStart + get32(entry + 8)
        return readDateString(view, valOffset)
      }
      // 0x8769 = Exif sub-IFD pointer
      if (tag === 0x8769) {
        const sub = tiffStart + get32(entry + 8)
        const fromSub = findDate(sub)
        if (fromSub) return fromSub
      }
    }
    return null
  }
  return findDate(ifd0)
}

function readDateString(view: DataView, offset: number): string | null {
  // EXIF datetime format: "YYYY:MM:DD HH:MM:SS"
  let str = ''
  for (let i = 0; i < 19; i++) {
    const c = view.getUint8(offset + i)
    if (c === 0) break
    str += String.fromCharCode(c)
  }
  const m = str.match(/^(\d{4}):(\d{2}):(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}
