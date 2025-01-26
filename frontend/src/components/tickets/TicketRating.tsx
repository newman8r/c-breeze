'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'

interface TicketRatingProps {
  ticketId: string
  currentRating?: number | null
  onRatingSubmit?: (rating: number) => void
}

export default function TicketRating({ ticketId, currentRating, onRatingSubmit }: TicketRatingProps) {
  const [rating, setRating] = useState<number | null>(currentRating || null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  const handleRatingSubmit = async (selectedRating: number) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/modify-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          satisfaction_rating: selectedRating,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit rating')
      }

      setRating(selectedRating)
      onRatingSubmit?.(selectedRating)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayRating = hoveredRating ?? rating

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <p className="text-sm text-gray-600 mb-2">
        {rating === null ? 'How satisfied were you with our service?' : 'Thank you for your feedback!'}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !isSubmitting && handleRatingSubmit(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(null)}
            disabled={isSubmitting}
            className={`p-1 transition-transform hover:scale-110 ${
              isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
            aria-label={`Rate ${star} stars`}
          >
            {star <= (displayRating || 0) ? (
              <StarIcon className="w-8 h-8 text-yellow-400" />
            ) : (
              <StarOutlineIcon className="w-8 h-8 text-gray-300" />
            )}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
} 
