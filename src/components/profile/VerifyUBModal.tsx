'use client'
import { useState } from 'react'
import { X, ShieldCheck, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function VerifyUBModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

  async function request() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/verify-ub/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(
        json.error === 'not_a_buffalo_email'
          ? 'Use your @buffalo.edu email'
          : json.error === 'email_already_verified'
            ? 'That email is already verified on another account'
            : 'Could not send code',
      )
      return
    }
    if (json.devCode) setHint(`Dev code: ${json.devCode}`)
    setStep('code')
  }

  async function confirm() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/verify-ub/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error === 'invalid_code' ? 'Wrong code' : json.error === 'code_expired' ? 'Code expired' : 'Could not verify')
      return
    }
    await refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-end">
      <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-[20px] p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#027A48]" /> Verify UB email
          </span>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        {step === 'email' ? (
          <>
            <p className="text-sm text-gray-500 mb-3">
              Earn a green &quot;UB verified&quot; badge. We store only a one-way hash of your email
              — never the address itself.
            </p>
            <input
              className="input mb-3"
              placeholder="you@buffalo.edu"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
            <button className="btn btn-primary w-full py-3" onClick={request} disabled={loading}>
              {loading && <Loader2 size={15} className="animate-spin" />} Send code
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">Enter the 6-digit code sent to {email}.</p>
            {hint && <div className="text-xs text-ub-blue mb-2">{hint}</div>}
            <input
              className="input text-center tracking-[0.4em] text-lg mb-3"
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
            <button className="btn btn-primary w-full py-3" onClick={confirm} disabled={loading}>
              {loading && <Loader2 size={15} className="animate-spin" />} Verify
            </button>
          </>
        )}
      </div>
    </div>
  )
}
