'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return stored || preferred
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <button
      onClick={toggle}
      className="relative p-2 rounded-xl bg-surface-solid border border-border hover:border-border-strong transition-all duration-200 hover:shadow-sm group"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <Sun className={`w-4 h-4 transition-all duration-300 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0 absolute' : 'opacity-100 rotate-0 scale-100 text-amber-500'}`} />
      <Moon className={`w-4 h-4 transition-all duration-300 ${theme === 'light' ? 'opacity-0 -rotate-90 scale-0 absolute' : 'opacity-100 rotate-0 scale-100 text-indigo-400'}`} />
    </button>
  )
}
