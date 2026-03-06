'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

interface QRCodeModalProps {
  code: string
  onClose: () => void
}

export default function QRCodeModal({ code, onClose }: QRCodeModalProps) {
  const [joinUrl, setJoinUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin
      setJoinUrl(`${baseUrl}/room/play/${code}`)
    }
  }, [code])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 rounded-3xl p-8 max-w-md w-full mx-4 animate-[popIn_0.3s_ease]"
        style={{
          background: 'rgba(26,39,68,0.95)',
          border: '1px solid rgba(61,126,255,0.3)',
          boxShadow: '0 0 60px rgba(61,126,255,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-blue-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-black mb-2"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              background: 'linear-gradient(135deg, #3D7EFF, #00E5FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SCAN QR CODE
          </h2>
          <p className="text-sm text-blue-300">
            Scan untuk join room dengan cepat
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(10,14,26,0.8)',
              border: '2px solid rgba(61,126,255,0.3)',
            }}
          >
            {joinUrl && (
              <QRCodeSVG
                value={joinUrl}
                size={220}
                level="H"
                includeMargin={true}
                fgColor="#3D7EFF"
                bgColor="transparent"
              />
            )}
          </div>
        </div>

        {/* Room Code */}
        <div className="text-center mb-6">
          <p className="text-xs text-blue-400 uppercase tracking-widest mb-2">
            Atau masukkan kode manual
          </p>
          <div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl"
            style={{
              background: 'rgba(61,126,255,0.15)',
              border: '1px solid rgba(61,126,255,0.3)',
            }}
          >
            <span
              className="text-3xl font-black tracking-[0.3em]"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                color: '#FFD700',
              }}
            >
              {code}
            </span>
          </div>
        </div>

        {/* Share URL */}
        <div
          className="rounded-xl p-3 mb-4"
          style={{
            background: 'rgba(0,229,255,0.08)',
            border: '1px solid rgba(0,229,255,0.2)',
          }}
        >
          <p className="text-xs text-blue-300 text-center truncate">
            {joinUrl}
          </p>
        </div>

        {/* Copy button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(joinUrl)
          }}
          className="w-full py-3 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            background: 'linear-gradient(135deg, #3D7EFF, #00E5FF)',
            color: '#0A0E1A',
          }}
        >
          📋 Copy Link
        </button>
      </div>
    </div>
  )
}
