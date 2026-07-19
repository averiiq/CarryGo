'use client'

import { useState, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, ImageOff, Eye } from 'lucide-react'
import { motion } from 'framer-motion'

type DocumentType = 'id_front' | 'id_back' | 'selfie' | 'address_proof'

type DocumentData = {
  type: DocumentType
  url: string | null
  label: string
}

type DocumentViewerProps = {
  documents: DocumentData[]
}

function isSafeDocUrl(url: string | null): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false

    const allowedSuffixes = [
      '.supabase.co',
      '.cloudinary.com',
    ]

    const projectSupabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? (() => {
          try {
            return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
          } catch {
            return null
          }
        })()
      : null

    const hostname = parsed.hostname

    if (projectSupabaseHost && hostname === projectSupabaseHost) return true

    return allowedSuffixes.some((suffix) => {
      if (hostname === suffix.slice(1)) return true
      if (hostname.endsWith(suffix)) return true
      return false
    })
  } catch {
    return false
  }
}

const TAB_LABELS: Record<DocumentType, string> = {
  id_front: 'ID Front',
  id_back: 'ID Back',
  selfie: 'Selfie',
  address_proof: 'Address Proof',
}

export default function DocumentViewer({ documents }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<DocumentType>('id_front')
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [imgError, setImgError] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const activeDocument = documents.find((d) => d.type === activeTab) || null
  const selfieDoc = documents.find((d) => d.type === 'selfie') || null
  const idFrontDoc = documents.find((d) => d.type === 'id_front') || null

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 4))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.1, 4))
    } else {
      setZoom((prev) => Math.max(prev - 0.1, 0.5))
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsPanning(true)
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      }
    },
    [zoom, panOffset]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        })
      }
    },
    [isPanning, panStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else if (isFullscreen) {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [isFullscreen])

  const resetView = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  const handleTabChange = useCallback((tab: DocumentType) => {
    setActiveTab(tab)
    setZoom(1)
    setRotation(0)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  const hasValidUrl = activeDocument && isSafeDocUrl(activeDocument.url) && !imgError.has(activeTab)

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5">
        {documents.map((doc) => {
          const hasUrl = isSafeDocUrl(doc.url) && !imgError.has(doc.type)
          return (
            <button
              key={doc.type}
              onClick={() => handleTabChange(doc.type)}
              className={`relative px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                activeTab === doc.type
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              {TAB_LABELS[doc.type]}
              {!hasUrl && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-warning" />
              )}
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg border border-border hover:bg-surface-elevated hover:border-border-strong transition-all"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5 text-muted" />
          </button>
          <span className="text-xs text-muted min-w-[3rem] text-center tabular-nums font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg border border-border hover:bg-surface-elevated hover:border-border-strong transition-all"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5 text-muted" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-lg border border-border hover:bg-surface-elevated hover:border-border-strong transition-all"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5 text-muted" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg border border-border hover:bg-surface-elevated hover:border-border-strong transition-all"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-muted" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-muted" />
            )}
          </button>
        </div>
        <button
          onClick={resetView}
          className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Image Display Area */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-border bg-background overflow-hidden"
        style={{ minHeight: '400px', height: isFullscreen ? '100vh' : '480px' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {hasValidUrl ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex items-center justify-center p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeDocument.url!}
              alt={`KYC Document - ${TAB_LABELS[activeTab]}`}
              className="max-w-full max-h-full object-contain select-none rounded-lg"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                transition: isPanning ? 'none' : 'transform 0.2s ease',
                cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
              }}
              draggable={false}
              onError={() => setImgError(prev => new Set(prev).add(activeTab))}
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center">
                <ImageOff className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted font-medium">
                {imgError.has(activeTab) ? 'Failed to load image' : 'No document uploaded'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {imgError.has(activeTab)
                  ? 'The image URL may be expired or inaccessible'
                  : `${TAB_LABELS[activeTab]} has not been submitted`
                }
              </p>
              {activeDocument?.url && !isSafeDocUrl(activeDocument.url) && (
                <p className="text-[10px] text-danger/70 mt-2 font-mono break-all max-w-xs mx-auto">
                  URL blocked by security policy
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Face Comparison Section */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-3.5 h-3.5 text-muted" />
          <h3 className="text-xs font-semibold text-foreground">Face Comparison</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted font-medium">Selfie</p>
            <div className="aspect-square bg-background rounded-lg overflow-hidden flex items-center justify-center border border-border">
              {selfieDoc && isSafeDocUrl(selfieDoc.url) && !imgError.has('selfie') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selfieDoc.url!}
                  alt="Selfie"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(prev => new Set(prev).add('selfie'))}
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">No selfie</span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted font-medium">ID Front</p>
            <div className="aspect-square bg-background rounded-lg overflow-hidden flex items-center justify-center border border-border">
              {idFrontDoc && isSafeDocUrl(idFrontDoc.url) && !imgError.has('id_front') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={idFrontDoc.url!}
                  alt="ID Front"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(prev => new Set(prev).add('id_front'))}
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">No ID front</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
