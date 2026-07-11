'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  FileCheck,
  LifeBuoy,
  Settings,
  Navigation,
  Package,
  BarChart3,
  AlertTriangle,
  Layers,
  Search,
} from 'lucide-react'

const commands = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, section: 'Pages' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, section: 'Pages' },
  { name: 'Trips', href: '/dashboard/trips', icon: Navigation, section: 'Pages' },
  { name: 'Parcels', href: '/dashboard/parcels', icon: Package, section: 'Pages' },
  { name: 'KYC Verification', href: '/dashboard/kyc', icon: FileCheck, section: 'Pages' },
  { name: 'Users', href: '/dashboard/users', icon: Users, section: 'Pages' },
  { name: 'Disputes', href: '/dashboard/disputes', icon: AlertTriangle, section: 'Pages' },
  { name: 'Bulk Operations', href: '/dashboard/bulk', icon: Layers, section: 'Pages' },
  { name: 'Support', href: '/dashboard/support', icon: LifeBuoy, section: 'Pages' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, section: 'Pages' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        router.push(filtered[activeIndex].href)
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filtered, activeIndex, router, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-[20%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
                placeholder="Search pages..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="rounded-md bg-slate-100 border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No results found.</p>
              ) : (
                filtered.map((cmd, i) => {
                  const Icon = cmd.icon
                  return (
                    <button
                      key={cmd.href}
                      onClick={() => { router.push(cmd.href); onClose() }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        i === activeIndex ? 'bg-primary-subtle text-primary' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{cmd.name}</span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
