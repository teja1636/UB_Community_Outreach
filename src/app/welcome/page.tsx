'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Smartphone, MailCheck, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Step = 'phone' | 'otp'

export default function WelcomePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)

  // Already signed in? Skip straight into the app.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/feed')
    })
  }, [router])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  function normalize(p: string): string {
    const digits = p.replace(/[^\d]/g, '')
    // Default to US country code if a bare 10-digit number is entered.
    if (digits.length === 10) return `+1${digits}`
    if (p.trim().startsWith('+')) return `+${digits}`
    return `+${digits}`
  }

  async function sendCode() {
    setError('')
    const e164 = normalize(phone)
    if (e164.replace(/\D/g, '').length < 10) {
      setError('Enter a valid phone number')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep('otp')
    setResendIn(45)
  }

  async function verify() {
    setError('')
    if (code.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone: normalize(phone),
      token: code,
      type: 'sms',
    })
    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    // Create (or reclaim) our user row server-side, then route.
    const res = await fetch('/api/user/ensure', { method: 'POST' })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(
        json.error === 'account_blocked'
          ? 'This number is not allowed to sign up.'
          : 'Something went wrong creating your account.',
      )
      return
    }
    router.replace(json.needs_onboarding ? '/onboarding/location' : '/feed')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {step === 'otp' && (
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <button onClick={() => setStep('phone')} className="text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <span className="text-sm font-medium mx-auto pr-5">Enter code</span>
        </div>
      )}

      {step === 'phone' ? (
        <div className="flex-1 flex flex-col items-center justify-center px-7 py-9 gap-5">
          <div className="w-[70px] h-[70px] rounded-2xl bg-ub-blue flex items-center justify-center">
            <span className="text-white font-semibold text-3xl">UB</span>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold mb-1">UB community</div>
            <div className="text-sm text-gray-500">Rides · food · sales · campus life</div>
          </div>
          <div className="text-center text-sm text-ub-blue bg-ub-light px-4 py-3 rounded-xl leading-relaxed">
            We&apos;re not storing your identity.
            <br />
            We&apos;re storing your experience.
          </div>

          <div className="w-full">
            <label className="text-xs text-gray-400 mb-1.5 block">Phone number</label>
            <input
              className="input mb-2.5"
              placeholder="(716) 555-0148"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
            <button
              className="btn btn-primary w-full py-3"
              onClick={sendCode}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
              Send code
            </button>
          </div>
          <div className="text-xs text-gray-400 text-center leading-relaxed">
            One tap. No name, no email required.
            <br />
            Your number is hashed — we never store or show it.
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-4 py-6 gap-5">
          <div className="text-center">
            <MailCheck size={36} className="text-ub-blue mx-auto" />
            <div className="text-sm font-medium mt-2.5 mb-1">Check your texts</div>
            <div className="text-sm text-gray-500">6-digit code sent to your phone</div>
          </div>
          <input
            className="input text-center tracking-[0.5em] text-xl"
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          {error && <div className="text-xs text-red-500 text-center">{error}</div>}
          <button className="btn btn-primary w-full py-3" onClick={verify} disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            Verify
          </button>
          <button
            className="text-xs text-gray-400 text-center disabled:opacity-50"
            disabled={resendIn > 0 || loading}
            onClick={sendCode}
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
        </div>
      )}
    </div>
  )
}
