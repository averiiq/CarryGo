import Link from 'next/link'

type PaginationProps = {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  itemLabel: string
  query?: Record<string, string>
}

export default function Pagination({ page, totalPages, totalItems, pageSize, itemLabel, query = {} }: PaginationProps) {
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize
  const hrefFor = (nextPage: number) => `?${new URLSearchParams({ ...query, page: String(nextPage) })}`

  return (
    <nav aria-label={`${itemLabel} pagination`} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted">Showing {from + 1}–{Math.min(from + pageSize, totalItems)} of {totalItems} {itemLabel}</p>
      <div className="flex gap-2">
        {page > 1 && <Link href={hrefFor(page - 1)} className="button-secondary px-4 py-2 text-sm">Previous</Link>}
        {page < totalPages && <Link href={hrefFor(page + 1)} className="button-secondary px-4 py-2 text-sm">Next</Link>}
      </div>
    </nav>
  )
}
