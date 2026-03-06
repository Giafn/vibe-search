'use client'

interface HistoryItem {
  id: string
  word: string
  isCorrect: boolean
  isAlreadyFound: boolean
  points: number
  message: string
  time: string
}

interface HistoryListProps {
  history: HistoryItem[]
}

export default function HistoryList({ history }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-6 opacity-40">
        <div className="text-3xl mb-2">🔍</div>
        <p className="text-sm text-blue-300">Belum ada tebakan</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {[...history].reverse().map(item => {
        let statusIcon = '❌'
        let statusColor = '#FF4757'
        let bgColor = 'rgba(255,71,87,0.08)'
        let borderColor = 'rgba(255,71,87,0.2)'

        if (item.isCorrect) {
          statusIcon = '✅'
          statusColor = '#00FF9D'
          bgColor = 'rgba(0,255,157,0.08)'
          borderColor = 'rgba(0,255,157,0.3)'
        } else if (item.isAlreadyFound) {
          statusIcon = '⚠️'
          statusColor = '#FFB300'
          bgColor = 'rgba(255,179,0,0.08)'
          borderColor = 'rgba(255,179,0,0.2)'
        }

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 animate-[popIn_0.3s_ease]"
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
            }}>
            <span className="text-lg leading-none">{statusIcon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ fontFamily: 'Orbitron, sans-serif', color: statusColor }}>
                {item.word}
              </p>
              <p className="text-xs opacity-60 truncate">{item.message}</p>
            </div>
            {item.isCorrect && (
              <span className="font-black text-sm" style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif' }}>
                +{item.points}
              </span>
            )}
            <span className="text-xs opacity-30">{item.time}</span>
          </div>
        )
      })}
    </div>
  )
}
