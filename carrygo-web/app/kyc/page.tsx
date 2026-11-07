'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Fingerprint,
  IdCard,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'
import {
  dataUrlToBlob,
  fetchLatestKycSession,
  generateAadhaarOtp,
  skipPan,
  submitSandboxKyc,
  uploadSelfie,
  verifyAadhaarOtp,
  verifyPan,
  type KycSessionSnapshot,
} from '@/services/kyc.service'

type KycStep = 'loading' | 'aadhaar' | 'otp' | 'selfie' | 'pan' | 'submitted' | 'approved'

interface UserCtx {
  id: string
  email?: string
  fullName: string
}

export default function CustomerKycPage() {
  const [step, setStep] = useState<KycStep>('loading')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<UserCtx | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [referenceId, setReferenceId] = useState<string | null>(null)
  const [maskedAadhaar, setMaskedAadhaar] = useState<string | null>(null)
  const [mobileEnding, setMobileEnding] = useState<string | undefined>(undefined)

  // Form state
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [aadhaarOtp, setAadhaarOtp] = useState('')
  const [panNumber, setPanNumber] = useState('')

  // Selfie
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null)

  const resumeFromSession = useCallback((snap: KycSessionSnapshot | null) => {
    if (!snap) {
      setStep('aadhaar')
      return
    }
    setSessionId(snap.id)
    setReferenceId(snap.aadhaarReferenceId ?? null)
    if (snap.status === 'approved') {
      setStep('approved')
      return
    }
    if (snap.status === 'submitted') {
      setStep('submitted')
      return
    }
    // pending — pick up where they left off
    if (snap.aadhaarStatus !== 'verified') {
      setStep(snap.aadhaarReferenceId ? 'otp' : 'aadhaar')
      return
    }
    if (snap.selfieStatus !== 'uploaded' && snap.selfieStatus !== 'verified') {
      setStep('selfie')
      return
    }
    setStep('pan')
  }, [])

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        if (!cancelled) setStep('aadhaar')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_verified, kyc_status, full_name')
        .eq('id', authUser.id)
        .maybeSingle()

      const fullName =
        profile?.full_name ||
        (authUser.user_metadata?.full_name as string | undefined) ||
        authUser.email?.split('@')[0] ||
        'Verified User'

      if (!cancelled) {
        setUser({ id: authUser.id, email: authUser.email, fullName })
      }

      if (profile?.is_verified || profile?.kyc_status === 'approved') {
        if (!cancelled) setStep('approved')
        return
      }

      const { data: snap } = await fetchLatestKycSession(authUser.id)
      if (!cancelled) resumeFromSession(snap)
    }

    void bootstrap()
    return () => {
      cancelled = true
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Camera ----
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
    } catch {
      setError('Camera access denied. Please allow camera permission and reload the page.')
    }
  }, [])

  const stopCamera = () => {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => {
    if (step === 'selfie' && !selfieDataUrl) void startCamera()
    if (step !== 'selfie') stopCamera()
  }, [step, selfieDataUrl, startCamera])

  const captureSelfie = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0, 480, 480)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setSelfieDataUrl(dataUrl)
    stopCamera()
  }

  // ---- Handlers ----
  const handleSendAadhaarOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!user) return
    const clean = aadhaarNumber.replace(/\D/g, '')
    if (clean.length !== 12) {
      setError('Aadhaar number must be exactly 12 digits.')
      return
    }
    setLoading(true)
    const result = await generateAadhaarOtp(user.id, user.fullName, clean)
    setLoading(false)
    if (!result.data) {
      setError(result.error ?? 'Could not request OTP.')
      return
    }
    setSessionId(result.data.sessionId)
    setReferenceId(result.data.referenceId)
    setMaskedAadhaar(result.data.maskedAadhaar)
    setMobileEnding(result.data.registeredMobileEnding)
    setStep('otp')
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!user || !sessionId || !referenceId) return
    const clean = aadhaarOtp.replace(/\D/g, '')
    if (clean.length !== 6) {
      setError('Enter the 6-digit OTP sent to your Aadhaar-linked mobile.')
      return
    }
    setLoading(true)
    const result = await verifyAadhaarOtp(
      sessionId,
      user.id,
      referenceId,
      clean,
      maskedAadhaar ?? undefined,
      aadhaarNumber.replace(/\D/g, ''),
    )
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setStep('selfie')
  }

  const handleUploadSelfie = async () => {
    if (!user || !sessionId || !selfieDataUrl) {
      setError('Please capture your selfie before continuing.')
      return
    }
    setError(null)
    setLoading(true)
    const blob = dataUrlToBlob(selfieDataUrl)
    const result = await uploadSelfie(sessionId, user.id, blob)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setStep('pan')
  }

  const handleVerifyPan = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!user || !sessionId) return
    setLoading(true)
    const panResult = await verifyPan(sessionId, user.id, panNumber)
    if (panResult.error) {
      setLoading(false)
      setError(panResult.error)
      return
    }
    const submitResult = await submitSandboxKyc(sessionId, user.id)
    setLoading(false)
    if (submitResult.error) {
      setError(submitResult.error)
      return
    }
    setStep('submitted')
  }

  const handleSkipPan = async () => {
    if (!user || !sessionId) return
    setError(null)
    setLoading(true)
    const skipResult = await skipPan(sessionId, user.id)
    if (skipResult.error) {
      setLoading(false)
      setError(skipResult.error)
      return
    }
    const submitResult = await submitSandboxKyc(sessionId, user.id)
    setLoading(false)
    if (submitResult.error) {
      setError(submitResult.error)
      return
    }
    setStep('submitted')
  }

  const stepIndex: Record<Exclude<KycStep, 'loading' | 'submitted' | 'approved'>, number> = {
    aadhaar: 1,
    otp: 1,
    selfie: 2,
    pan: 3,
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
        <div className="mb-6">
          <Link
            href="/activity"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Deliveries
          </Link>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-10 border border-slate-200/90 bg-white shadow-xl space-y-8">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">
                  Customer Identity Verification (KYC)
                </h1>
              </div>
              <p className="text-xs text-slate-500">
                Government-mandated identity verification to unlock peer-to-peer parcel delivery and payouts.
              </p>
            </div>

            {step === 'approved' && (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
              </span>
            )}
            {step === 'submitted' && (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Awaiting Review
              </span>
            )}
          </div>

          {step !== 'loading' && step !== 'submitted' && step !== 'approved' && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { idx: 1, label: '1. Aadhaar' },
                { idx: 2, label: '2. Live Selfie' },
                { idx: 3, label: '3. PAN Card' },
              ].map(({ idx, label }) => {
                const current = stepIndex[step as keyof typeof stepIndex]
                const isActive = current === idx
                const isDone = current > idx
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl border ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900'
                        : isDone
                          ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          {step === 'loading' && (
            <div className="py-16 flex items-center justify-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {step === 'aadhaar' && (
            <form onSubmit={handleSendAadhaarOtp} className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                  Instant Paperless e-KYC (UIDAI Sandbox)
                </p>
                <p>We verify your 12-digit Aadhaar securely using UIDAI-authorized gateway APIs. An OTP will be sent to your Aadhaar-linked mobile number.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">12-Digit Aadhaar Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  value={aadhaarNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
                    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw
                    setAadhaarNumber(formatted)
                  }}
                  placeholder="XXXX XXXX XXXX"
                  className="w-full text-base font-mono tracking-wider px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || aadhaarNumber.replace(/\D/g, '').length !== 12}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Aadhaar OTP'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                OTP sent {mobileEnding ? <>to mobile ending <b>••{mobileEnding}</b></> : 'to your Aadhaar-linked mobile'}. Valid for 10 minutes.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={aadhaarOtp}
                  onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition font-bold"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAadhaarOtp('')
                    setStep('aadhaar')
                  }}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  disabled={loading || aadhaarOtp.length !== 6}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 'selfie' && (
            <div className="space-y-6 text-center">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Live Face Verification</h3>
                <p className="text-xs text-slate-500">
                  Ensure your face is clearly visible without sunglasses or face coverings.
                </p>
              </div>

              <div className="relative mx-auto w-64 h-64 rounded-full overflow-hidden border-4 border-emerald-500/80 bg-slate-900 shadow-xl flex items-center justify-center">
                {selfieDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selfieDataUrl} alt="Captured selfie" className="w-full h-full object-cover" />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                )}
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                {selfieDataUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelfieDataUrl(null)
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      disabled={loading}
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadSelfie}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          Confirm &amp; Next <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/25 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> Capture Photo
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'pan' && (
            <form onSubmit={handleVerifyPan} className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <IdCard className="w-4 h-4 text-emerald-600" />
                  Tax &amp; Regulatory Verification
                </p>
                <p>Required by payment settlement regulations for booking payouts. You can skip for now and add it later from your profile.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">10-Digit PAN Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="w-full text-base font-mono tracking-widest uppercase px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleSkipPan}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Skip for now
                </button>
                <button
                  type="submit"
                  disabled={loading || panNumber.trim().length !== 10}
                  className="flex-1 py-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/25"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Review'}
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 'submitted' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-md shadow-amber-200">
                <Clock className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-heading font-extrabold text-slate-900">
                  Submitted — Awaiting Review
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Our verification team is reviewing your documents. You'll receive a notification once your account is approved (usually within 24 hours).
                </p>
              </div>
              <div className="pt-3 flex justify-center gap-3">
                <Link
                  href="/activity"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                >
                  Back to My Deliveries
                </Link>
              </div>
            </div>
          )}

          {step === 'approved' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md shadow-emerald-200">
                <UserCheck className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-heading font-extrabold text-slate-900">
                  Government ID Verified Successfully
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your identity has been verified. The verified traveler shield is now displayed on your listings and profile.
                </p>
              </div>
              <div className="pt-3 flex justify-center gap-3">
                <Link
                  href="/activity"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                >
                  Go to Deliveries
                </Link>
                <Link
                  href="/create-trip"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Offer a Trip
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketingShell>
  )
}
