'use client'

import { useScriptureSettings, FONT_SIZE_LABELS } from '@/lib/use-scripture-settings'

const SAMPLE_SIZES = ['text-[10px]', 'text-xs', 'text-sm', 'text-base', 'text-lg'] as const

export function FontSizeControl() {
  const { fontSize, setFontSize } = useScriptureSettings()

  return (
    <div className="flex items-center gap-1.5">
      {FONT_SIZE_LABELS.map((label, i) => {
        const active = fontSize === i
        return (
          <button
            key={label}
            onClick={() => setFontSize(i)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              active
                ? 'border-gold/50 text-gold bg-gold/5'
                : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            <span className={SAMPLE_SIZES[i]}>A</span>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
