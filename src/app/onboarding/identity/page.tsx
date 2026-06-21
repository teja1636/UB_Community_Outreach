'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { AVATARS } from '@/lib/constants'

export default function IdentityStep() {
  const router = useRouter()
  const { user, refresh } = useAuth()
  const [avatar, setAvatar] = useState<string>(user?.avatar_emoji ?? AVATARS[0])
  const [mode, setMode] = useState<'anon' | 'named'>('anon')
  const [realName, setRealName] = useState('')
  const [saving, setSaving] = useState(false)

  async function continueAnon() {
    if (!user) return
    setSaving(true)
    await supabase
      .from('users')
      .update({ avatar_emoji: avatar, is_anonymous: true })
      .eq('id', user.id)
    await refresh()
    router.push('/onboarding/priorities')
  }

  async function continueNamed() {
    if (!user) return
    setSaving(true)
    await supabase
      .from('users')
      .update({
        avatar_emoji: avatar,
        real_name: realName.trim() || null,
        is_anonymous: !realName.trim(),
        display_name: realName.trim() || user.display_name,
      })
      .eq('id', user.id)
    await refresh()
    router.push('/onboarding/priorities')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="text-center py-3 border-b border-gray-100 text-sm font-medium">
        Choose your identity
      </div>
      <div className="flex-1 px-4 py-5 flex flex-col gap-3">
        {/* Anonymous */}
        <div
          className={`border-2 rounded-xl p-4 ${
            mode === 'anon' ? 'border-ub-blue' : 'border-gray-200'
          }`}
          onClick={() => setMode('anon')}
        >
          <div className="text-sm font-medium mb-1">Stay anonymous</div>
          <div className="text-xs text-gray-400 mb-3">
            Pick an avatar — you&apos;ll appear as {user?.display_name ?? 'Buffalo #0000'}
          </div>
          <div className="flex gap-2.5 justify-center mb-3">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={(e) => {
                  e.stopPropagation()
                  setAvatar(a)
                }}
                className={`text-3xl rounded-full p-0.5 transition-all ${
                  avatar === a ? 'ring-2 ring-ub-blue' : 'opacity-70'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          {mode === 'anon' && (
            <button
              className="btn btn-primary w-full py-2.5"
              onClick={continueAnon}
              disabled={saving}
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Continue as {avatar} {user?.display_name}
            </button>
          )}
        </div>

        {/* Named */}
        <div
          className={`border-2 rounded-xl p-4 ${
            mode === 'named' ? 'border-ub-blue' : 'border-gray-200'
          }`}
          onClick={() => setMode('named')}
        >
          <div className="text-sm font-medium mb-1">Add a name &amp; photo</div>
          <div className="text-xs text-gray-400 mb-3">
            Optional · build more trust · reversible anytime
          </div>
          {mode === 'named' ? (
            <div className="flex flex-col gap-2.5">
              <input
                className="input"
                placeholder="Your name"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
              />
              <button
                className="btn btn-primary w-full py-2.5"
                onClick={continueNamed}
                disabled={saving}
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                Continue
              </button>
            </div>
          ) : (
            <button className="btn w-full py-2.5">
              <Camera size={16} /> Add name &amp; photo
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400 text-center mt-1">
          You can verify your UB email later for a trusted badge
        </div>
      </div>
    </div>
  )
}
