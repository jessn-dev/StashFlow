'use client'

import { useState, useEffect } from 'react'

export default function ClientOnly({
  children,
  fallback = null
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // During the server render and initial hydration, render nothing (or a skeleton)
  if (!hasMounted) {
    return <>{fallback}</>
  }

  // Once safely mounted in the browser, render the real interactive component
  return <>{children}</>
}