import { ShieldCheck, Lock, Package } from 'lucide-react'

export function BookingVaultIllustration() {
  return (
    <div className='relative mx-auto flex max-w-2xl items-center justify-center'>
      <div className='relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border bg-surface'>
        {/* ambient brand glow */}
        <div
          aria-hidden
          className='absolute inset-0'
          style={{
            backgroundImage: `
              radial-gradient(ellipse 60% 60% at 25% 35%, rgba(0, 74, 173, 0.08), transparent 70%),
              radial-gradient(ellipse 60% 60% at 75% 70%, rgba(0, 139, 72, 0.08), transparent 70%)
            `,
          }}
        />
        <div
          aria-hidden
          className='absolute inset-0 opacity-50'
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100, 116, 139, 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100, 116, 139, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        {/* orbiting chip stack */}
        <div className='absolute left-8 top-10 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary-subtle text-primary'>
            <Lock className='h-4 w-4' />
          </div>
          <div>
            <p className='text-[11px] font-semibold text-muted'>Safe Pay</p>
            <p className='text-sm font-semibold text-foreground'>Payment reserved</p>
          </div>
        </div>

        <div className='absolute right-8 top-20 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
            <Package className='h-4 w-4' />
          </div>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-muted'>Parcel</p>
            <p className='text-sm font-semibold text-foreground'>In transit</p>
          </div>
        </div>

        {/* center vault shield */}
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'>
          <div className='flex h-28 w-28 items-center justify-center rounded-full bg-primary text-white shadow-lg'>
            <ShieldCheck className='h-12 w-12' strokeWidth={1.75} />
          </div>
          <div className='mt-4 text-center'>
            <p className='text-sm font-semibold text-foreground'>CaryGoo Vault</p>
            <p className='mt-1 text-xs text-muted'>Funds released only on verified delivery</p>
          </div>
        </div>
      </div>
    </div>
  )
}
