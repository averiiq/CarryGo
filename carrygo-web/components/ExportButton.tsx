'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface ExportColumn {
  key: string
  label: string
}

interface ExportButtonProps {
  data: object[]
  columns: ExportColumn[]
  filename?: string
  format?: 'csv' | 'json'
  label?: string
}

function generateCSV(data: object[], columns: ExportColumn[]): string {
  const header = columns.map(c => `"${c.label}"`).join(',')
  const rows = data.map((row) =>
    columns.map(col => {
      const val = (row as Record<string, unknown>)[col.key]
      if (val == null) return ''
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ExportButton({
  data,
  columns,
  filename = 'export',
  format = 'csv',
  label = 'Export',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    await new Promise(resolve => setTimeout(resolve, 100))

    if (format === 'csv') {
      const csv = generateCSV(data, columns)
      downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
    } else {
      const json = JSON.stringify(data, null, 2)
      downloadBlob(json, `${filename}.json`, 'application/json')
    }

    setIsExporting(false)
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || data.length === 0}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-surface border border-border rounded-xl hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {label} {data.length > 0 && `(${data.length})`}
    </button>
  )
}
