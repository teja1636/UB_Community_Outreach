'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings,
  ShieldCheck,
  Pencil,
  Banknote,
  Users,
  LogOut,
  ChevronRight,
  Plus,
  CircleCheck,
  Circle,
  Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { timeAgo } from '@/lib/trust'
import type { PostRow } from '@/lib/types'
import Avatar from '@/components/ui/Avatar'
import { TrustTagChips } from '@/components/ui/TrustBadge'
import BottomNav from '@/components/ui/BottomNav'
import EditProfileModal from '@/components/profile/EditProfileModal'
import VerifyUBModal from '@/components/profile/VerifyUBModal'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [myPosts, setMyPosts] = useState<PostRow[]>([])
  const [bookmarks, setBookmarks] = useState<PostRow[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showVerify, setShowVerify] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyPosts((data as PostRow[]) ?? []))
    supabase
      .from('bookmarks')
      .select('posts(*)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const rows = ((data as unknown as { posts: PostRow | null }[]) ?? [])
          .map((d) => d.posts)
          .filter((p): p is PostRow => p !== null)
        setBookmarks(rows)
      })
  }, [user])

  if (loading || !user) {
    return (
      <div className="with-bottom-nav p-4">
        <div className="skeleton h-16 w-16 rounded-full mx-auto mb-3" />
        <div className="skeleton h-4 w-32 rounded mx-auto" />
        <BottomNav />
      </div>
    )
  }

  // Complete-profile checklist.
  const tasks = [
    { label: 'Phone verified', done: true },
    { label: 'Avatar chosen', done: true },
    { label: 'Verify UB email → trusted tag', done: user.is_ub_verified, action: () => setShowVerify(true) },
    { label: 'Add a name & photo (optional)', done: !user.is_anonymous, action: () => setShowEdit(true) },
  ]
  const completed = tasks.filter((t) => t.done).length

  async function logout() {
    await signOut()
    router.replace('/welcome')
  }

  function invite() {
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    if (navigator.share) navigator.share({ title: 'UB Community', url }).catch(() => {})
    else navigator.clipboard?.writeText(url)
  }

  return (
    <div className="with-bottom-nav">
      <div className="sticky top-0 bg-white z-40 flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-medium">Profile</span>
        <button className="text-gray-500" onClick={() => setShowEdit(true)}>
          <Settings size={20} />
        </button>
      </div>

      {/* Identity */}
      <div className="text-center px-4 pt-5 pb-3">
        <div className="flex justify-center mb-2">
          <Avatar user={user} size={68} />
        </div>
        <div className="text-base font-semibold">{user.real_name || user.display_name}</div>
        <div className="text-xs text-gray-400 mb-2.5">joined {timeAgo(user.created_at)} ago</div>
        <TrustTagChips user={user} />
        {!user.is_ub_verified && (
          <button
            className="chip chip-blue mt-2 mx-auto"
            onClick={() => setShowVerify(true)}
          >
            <Plus size={11} /> verify UB
          </button>
        )}
      </div>

      {/* Complete profile */}
      {completed < tasks.length && (
        <div className="mx-4 mb-1 border border-ub-blue rounded-xl p-3.5 bg-ub-light">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ub-blue">Complete your profile</span>
            <span className="text-xs text-ub-blue">
              {completed} of {tasks.length}
            </span>
          </div>
          <div className="h-1.5 bg-ub-blue/15 rounded-full mb-3 overflow-hidden">
            <div className="h-full bg-ub-blue" style={{ width: `${(completed / tasks.length) * 100}%` }} />
          </div>
          {tasks.map((t) => (
            <button
              key={t.label}
              onClick={t.action}
              disabled={t.done || !t.action}
              className="flex items-center gap-2 mb-1.5 w-full text-left disabled:cursor-default"
            >
              {t.done ? (
                <CircleCheck size={15} className="text-[#027A48]" />
              ) : (
                <Circle size={15} className="text-ub-blue" />
              )}
              <span className={`text-sm ${t.done ? 'text-gray-500' : 'text-ub-blue font-medium'}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-2 p-4">
        {[
          { label: 'Rating', value: user.rating?.toFixed(1) ?? '—' },
          { label: 'Orders', value: user.total_orders ?? 0 },
          { label: 'Rides', value: user.total_rides ?? 0 },
          { label: 'No-shows', value: user.no_shows ?? 0 },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-gray-50 rounded-xl p-2.5 text-center">
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-lg font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tags you can earn */}
      <div className="text-xs font-medium text-gray-500 px-4 pb-2">Tags you can earn</div>
      <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
        {user.is_ub_verified ? (
          <span className="chip chip-green">
            <ShieldCheck size={11} /> UB verified
          </span>
        ) : null}
        <span className="chip opacity-60">
          <Lock size={11} /> trusted seller · {Math.max(0, 10 - (user.total_orders ?? 0))} more
        </span>
        <span className="chip opacity-60">
          <Lock size={11} /> top rider · {Math.max(0, 10 - (user.total_rides ?? 0))} more
        </span>
      </div>

      {/* Your posts */}
      <div className="text-xs font-medium text-gray-500 px-4 pt-3 pb-1">Your posts</div>
      {myPosts.length === 0 ? (
        <div className="px-4 text-xs text-gray-400 pb-2">You haven&apos;t posted yet.</div>
      ) : (
        myPosts.slice(0, 5).map((p) => (
          <div key={p.id} className="flex items-center gap-2 px-4 py-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
              📄
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{p.title}</div>
              <div className="text-xs text-gray-400">{p.status}</div>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        ))
      )}

      {/* Saved */}
      <div className="text-xs font-medium text-gray-500 px-4 pt-3 pb-1">Saved &amp; bookmarks</div>
      {bookmarks.length === 0 ? (
        <div className="px-4 text-xs text-gray-400 pb-2">Nothing saved yet.</div>
      ) : (
        bookmarks.slice(0, 5).map((p) => (
          <div key={p.id} className="flex items-center gap-2 px-4 py-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
              🔖
            </div>
            <div className="flex-1 text-sm font-medium">{p.title}</div>
          </div>
        ))
      )}

      {/* Settings */}
      <div className="text-xs font-medium text-gray-500 px-4 pt-3 pb-1">Settings</div>
      <SettingsRow icon={ShieldCheck} label="Verify UB email" onClick={() => setShowVerify(true)} />
      <SettingsRow icon={Pencil} label="Edit identity" onClick={() => setShowEdit(true)} />
      <SettingsRow icon={Banknote} label="Payment handles" onClick={() => setShowEdit(true)} />
      <SettingsRow icon={Users} label="Invite friends" onClick={invite} />
      <button
        onClick={logout}
        className="flex items-center gap-2 px-4 py-3 text-sm text-red-500 w-full"
      >
        <LogOut size={16} /> Log out
      </button>
      <div className="h-4" />

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
      {showVerify && <VerifyUBModal onClose={() => setShowVerify(false)} />}
      <BottomNav />
    </div>
  )
}

function SettingsRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ShieldCheck
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 w-full border-t border-gray-50"
    >
      <span className="flex items-center gap-2 text-sm">
        <Icon size={16} className="text-gray-500" /> {label}
      </span>
      <ChevronRight size={16} className="text-gray-300" />
    </button>
  )
}
