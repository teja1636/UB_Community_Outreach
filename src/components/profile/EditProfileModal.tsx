'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { AVATARS } from '@/lib/constants'

export default function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { user, refresh } = useAuth()
  const [avatar, setAvatar] = useState(user?.avatar_emoji ?? AVATARS[0])
  const [realName, setRealName] = useState(user?.real_name ?? '')
  const [venmo, setVenmo] = useState(user?.venmo_handle ?? '')
  const [cashapp, setCashapp] = useState(user?.cashapp_handle ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!user) return
    setSaving(true)
    const name = realName.trim()
    await supabase
      .from('users')
      .update({
        avatar_emoji: avatar,
        real_name: name || null,
        is_anonymous: !name,
        display_name: name || user.display_name,
        venmo_handle: venmo.trim() || null,
        cashapp_handle: cashapp.trim() || null,
      })
      .eq('id', user.id)
    await refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-end">
      <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-[20px] p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium">Edit profile</span>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>
        <label className="text-xs text-gray-500 mb-1 block">Avatar</label>
        <div className="flex gap-2.5 mb-3">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`text-2xl rounded-full p-1 ${avatar === a ? 'ring-2 ring-ub-blue' : 'opacity-70'}`}
            >
              {a}
            </button>
          ))}
        </div>
        <label className="text-xs text-gray-500 mb-1 block">Real name (optional)</label>
        <input
          className="input mb-3"
          placeholder="Leave blank to stay anonymous"
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
        />
        <label className="text-xs text-gray-500 mb-1 block">Venmo handle</label>
        <input
          className="input mb-3"
          placeholder="your-venmo"
          value={venmo}
          onChange={(e) => setVenmo(e.target.value)}
        />
        <label className="text-xs text-gray-500 mb-1 block">Cash App handle</label>
        <input
          className="input mb-4"
          placeholder="$yourcashtag"
          value={cashapp}
          onChange={(e) => setCashapp(e.target.value)}
        />
        <button className="btn btn-primary w-full py-3" onClick={save} disabled={saving}>
          {saving && <Loader2 size={15} className="animate-spin" />} Save
        </button>
      </div>
    </div>
  )
}
