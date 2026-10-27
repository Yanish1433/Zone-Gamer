import { useEffect, useMemo, useRef, useState } from 'react'
import { imageProblem } from '../../api'

// File input for a proof screenshot, with a preview. `onChange` gets the File (or null if invalid).
export default function ScreenshotPicker({ label, file, onChange, disabled }) {
  const input = useRef(null)
  const [error, setError] = useState('')
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const pick = (e) => {
    const f = e.target.files[0]
    const problem = f && imageProblem(f)
    setError(problem ?? '')
    onChange(problem ? null : (f ?? null))
    if (problem) e.target.value = ''
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-semibold uppercase tracking-wider text-white/60">{label}</span>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} disabled={disabled} className="hidden" />
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current.click()}
        className={`flex w-full items-center gap-4 rounded-xl border border-dashed bg-black/40 p-3 text-left transition hover:border-white/50 ${error ? 'border-red-500/70' : 'border-white/20'}`}
      >
        {preview ? (
          <img src={preview} alt="Selected screenshot" className="size-16 rounded-lg object-cover" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-lg bg-white/5 text-2xl">📷</span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-semibold">{file ? file.name : 'Tap to choose a screenshot'}</span>
          <span className="block text-sm text-white/40">{file ? 'Tap to change' : 'PNG, JPG or WebP · max 5 MB'}</span>
        </span>
      </button>
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </div>
  )
}
