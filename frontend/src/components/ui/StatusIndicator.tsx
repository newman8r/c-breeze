'use client'

interface StatusIndicatorProps {
  status: string
  isHeatmap?: boolean
}

export function StatusIndicator({ status, isHeatmap = false }: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case 'open':
        return '#EF4444' // Red for unassigned/open tickets
      case 'in_progress':
        return '#F59E0B' // Amber for in progress
      case 'resolved':
        return '#10B981' // Emerald for resolved
      case 'closed':
        return '#404040' // Neutral dark gray for closed
      default:
        return '#EF4444' // Default to open/red
    }
  }

  return (
    <div
      className={`w-2 h-2 rounded-full ${isHeatmap ? 'opacity-50' : ''}`}
      style={{ backgroundColor: getStatusColor() }}
    />
  )
} 