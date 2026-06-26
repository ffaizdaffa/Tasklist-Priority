import { useEffect, useState } from 'react'

interface Props {
  blob?: Blob | null
  alt?: string
  className?: string
  fallbackClassName?: string
}

/** Renders an image from a Blob, managing the object URL lifecycle. */
export function PhotoImg({ blob, alt = '', className, fallbackClassName }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])

  if (!url) {
    return (
      <div
        className={
          fallbackClassName ??
          'flex items-center justify-center bg-slate-100 text-slate-300 ' + (className ?? '')
        }
      >
        <svg width="40%" height="40%" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v7l4-4 3 3 4-4 3 3V7H4Zm5 1.5A1.5 1.5 0 1 1 6 8.5a1.5 1.5 0 0 1 3 0Z" />
        </svg>
      </div>
    )
  }

  return <img src={url} alt={alt} className={className} />
}
