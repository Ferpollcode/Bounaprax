'use client'

import { useState, useEffect } from 'react'

function getGreeting(h: number) {
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function Greeting() {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()))
  }, [])

  if (!greeting) return null

  return <p className="text-sm mb-1" style={{ color: 'var(--primary)' }}>{greeting}</p>
}
