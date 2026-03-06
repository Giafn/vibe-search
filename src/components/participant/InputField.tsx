'use client'

import { useRef, useState } from 'react'

interface InputFieldProps {
  onSubmit: (word: string) => Promise<void>
  disabled?: boolean
  loading?: boolean
}

export default function InputField({ onSubmit, disabled, loading }: InputFieldProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || loading || disabled) return
    setValue('')
    await onSubmit(trimmed)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          placeholder="Ketik kata..."
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full py-4 px-5 text-lg font-bold rounded-2xl focus:outline-none transition-all"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            background: 'rgba(26,39,68,0.8)',
            border: '2px solid rgba(61,126,255,0.4)',
            color: '#00E5FF',
            caretColor: '#00E5FF',
            letterSpacing: '0.15em',
          }}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled || loading || !value.trim()}
        className="px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
        style={{
          background: 'linear-gradient(135deg, #3D7EFF, #00E5FF)',
          color: '#0A0E1A',
          fontFamily: 'Orbitron, sans-serif',
          minWidth: '60px',
        }}>
        ⚡
      </button>
    </div>
  )
}
