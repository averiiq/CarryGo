'use client'

import { useEffect } from 'react'

/**
 * CarryGo enforces a pure light theme across the entire application.
 * This component ensures data-theme="light" and clears dark mode preferences.
 */
export default function ThemeToggle() {
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    } catch {
      // Ignore in restricted environments
    }
  }, [])

  return null
}
