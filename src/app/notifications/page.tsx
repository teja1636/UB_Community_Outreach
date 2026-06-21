'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Package, MessageCircle, Car, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { NotificationRow } from '@/lib/types'
import { timeAgo } from '@/lib/trust'
import ScreenHeader from '@/components/ui/ScreenHeader'

const ICONS: Record<string, typeof Bell> = {
  order: Package,
  message: MessageCircle,
  ride: Car,
  event: Calendar,
  system: Bell,
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user: me } = useAuth()
  const [notifs, setNotifs] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!me) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', me.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs((data as NotificationRow[]) ?? [])
    setLoading(false)
    // Mark all as read.
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', me.id)
      .is('read_at', null)
  }, [me])

  useEffect(() => {
    if (!me) return
    load()
    const channel = supabase
      .channel('notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [me, load])

  return (
    <div>
      <ScreenHeader title="Notifications" />
      {loading ? (
        <div className="p-4 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🔔</div>
          <div className="font-medium text-gray-700 mb-1">No notifications</div>
          <div className="text-sm text-gray-400">Orders, messages and ride updates show up here</div>
        </div>
      ) : (
        notifs.map((n) => {
          const Icon = ICONS[n.type] ?? Bell
          return (
            <button
              key={n.id}
              onClick={() => n.link && router.push(n.link)}
              className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 w-full text-left ${
                n.read_at ? '' : 'bg-ub-light/40'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-gray-500">{n.body}</div>}
                <div className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</div>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}
