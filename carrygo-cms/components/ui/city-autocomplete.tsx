'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { MapPin, Check, ChevronDown } from 'lucide-react'
import { searchCities, findCity, type IndianCity } from '@/lib/indian-cities'

interface CityAutocompleteProps {
  id?: string
  label?: string
  value: string
  onChange: (city: string) => void
  placeholder?: string
  iconColor?: string
  required?: boolean
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

export function CityAutocomplete({
  id,
  label,
  value,
  onChange,
  placeholder = 'Select Indian city...',
  iconColor = 'text-emerald-600',
  required = false,
  autoFocus = false,
  disabled = false,
  className = '',
}: CityAutocompleteProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const [query, setQuery] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  const suggestions = searchCities(query, 6)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (city: IndianCity) => {
    setQuery(city.name)
    onChange(city.name)
    setIsOpen(false)
    setSelectedIndex(0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    setIsOpen(true)
    setSelectedIndex(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (isOpen && suggestions[selectedIndex]) {
        e.preventDefault()
        handleSelect(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const getTierBadge = (tier: IndianCity['tier']) => {
    switch (tier) {
      case 'metro':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'tier1':
        return 'bg-sky-50 text-sky-700 border-sky-200'
      case 'tier2':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 pl-1"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <MapPin
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${
            isOpen ? 'text-emerald-600' : iconColor
          }`}
        />

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="off"
          className="w-full pl-10 pr-9 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen((prev) => !prev)
            inputRef.current?.focus()
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
          aria-label="Toggle city list"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5 flex items-center justify-between">
            <span>Suggested Indian Cities</span>
            <span className="font-mono text-[9px]">↑↓ to navigate</span>
          </div>

          <ul role="listbox" className="space-y-0.5">
            {suggestions.map((city, index) => {
              const isSelected = index === selectedIndex
              const isExact = city.name.toLowerCase() === value.toLowerCase().trim()

              return (
                <li
                  key={`${city.name}-${city.state}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => handleSelect(city)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-950 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="font-bold text-slate-900">{city.name}</span>
                      <span className="text-slate-400 text-[11px] ml-1.5">({city.state})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${getTierBadge(
                        city.tier
                      )}`}
                    >
                      {city.tier}
                    </span>
                    {isExact && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
