'use client'

import { useState, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2 } from 'lucide-react'

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
    const allowedPatterns = [
      '.supabase.co',
      '.cloudinary.com',
    ]
    return allowedPatterns.some(
      (pattern) =>
        parsed.hostname === pattern.slice(1) ||
        parsed.hostname.endsWith(pattern)
    )
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

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {documents.map((doc) => (
          <button
            key={doc.type}
            onClick={() => handleTabChange(doc.type)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === doc.type
                ? 'bg-blue-100 text-blue-800'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {TAB_LABELS[doc.type]}
            {!doc.url && (
              <span className="ml-1 text-xs text-gray-400">(missing)</span>
            )}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-700" />
          </button>
          <span className="text-sm text-gray-600 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            title="Rotate 90 degrees"
          >
            <RotateCw className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-gray-700" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-700" />
            )}
          </button>
        </div>
        <button
          onClick={resetView}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Reset view
        </button>
      </div>

      {/* Image Display Area */}
      <div
        ref={containerRef}
        className="relative bg-gray-100 rounded-xl border border-gray-200 overflow-hidden"
        style={{ minHeight: '400px', height: isFullscreen ? '100vh' : '500px' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {activeDocument && isSafeDocUrl(activeDocument.url) ? (
          <div className="w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeDocument.url!}
              alt={`KYC Document - ${TAB_LABELS[activeTab]}`}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                transition: isPanning ? 'none' : 'transform 0.2s ease',
                cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
              }}
              draggable={false}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">No document uploaded</p>
              <p className="text-xs text-gray-400 mt-1">
                {TAB_LABELS[activeTab]} has not been submitted
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Face Comparison Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Face Comparison</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Selfie</p>
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
              {selfieDoc && isSafeDocUrl(selfieDoc.url) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selfieDoc.url!}
                  alt="Selfie"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-gray-400">No selfie</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">ID Front</p>
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
              {idFrontDoc && isSafeDocUrl(idFrontDoc.url) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={idFrontDoc.url!}
                  alt="ID Front"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-gray-400">No ID front</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
