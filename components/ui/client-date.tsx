"use client"

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface ClientDateProps {
  date: Date | string
  fallback?: string
  formatString?: string
}

export function ClientDate({ 
  date, 
  fallback = 'Never',
  formatString = 'MMM d, yyyy h:mm a'
}: ClientDateProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (!dateObj || isNaN(dateObj.getTime())) {
    return <span suppressHydrationWarning>{fallback}</span>
  }

  // Use date-fns for consistent formatting across server and client
  try {
    const formattedDate = format(dateObj, formatString)
    return (
      <span suppressHydrationWarning>
        {mounted ? formattedDate : fallback}
      </span>
    )
  } catch (error) {
    return <span suppressHydrationWarning>{fallback}</span>
  }
}