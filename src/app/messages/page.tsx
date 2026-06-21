'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { MessageRow, UserRow } from '@/lib/types'
import { timeAgo } from '@/lib/trust'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Avatar from '@/components/ui/Avatar'

type Thread = { other: UserRow; last: MessageRow; unread: boolean }

export default function MessagesPage() {
  const router = useRouter()
  const { user: me } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!me) return
    async function load() {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${me!.id},receiver_id.eq.${me!.id}`)
        .order('created_at', { ascending: false })
        .limit(200)

      const rows = (msgs as MessageRow[]) ?? []
      const latestByOther = new Map<string, MessageRow>()
      for (const m of rows) {
        const other = m.sender_id === me!.id ? m.receiver_id : m.sender_id
        if (!latestByOther.has(other)) latestByOther.set(other, m)
      }
      const otherIds = [...latestByOther.keys()]
      if (otherIds.length === 0) {
        setThreads([])
        setLoading(false)
        return
      }
      const { data: users } = await supabase.from('users').select('*').in('id', otherIds)
      const userMap = new Map((users as UserRow[])?.map((u) => [u.id, u]) ?? [])
      const list: Thread[] = otherIds
        .map((id) => {
          const last = latestByOther.get(id)!
          const other = userMap.get(id)
          if (!other) return null
          const unread = last.receiver_id === me!.id && !last.read_at
          return { other, last, unread }
        })
        .filter((t): t is Thread => t !== null)
      setThreads(list)
      setLoading(false)
    }
    load()
  }, [me])

  return (
    <div>
      <ScreenHeader title="Messages" back={false} />
      {loading ? (
        <div className="p-4 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">💬</div>
          <div className="font-medium text-gray-700 mb-1">No messages yet</div>
          <div className="text-sm text-gray-400">Message a seller or driver to start a chat</div>
        </div>
      ) : (
        threads.map((t) => (
          <button
            key={t.other.id}
            onClick={() => router.push(`/messages/${t.other.id}`)}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 w-full text-left"
          >
            <Avatar user={t.other} size={42} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t.other.display_name}</span>
                <span className="text-xs text-gray-400">{timeAgo(t.last.created_at)}</span>
              </div>
              <div className={`text-sm truncate ${t.unread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                {t.last.content}
              </div>
            </div>
            {t.unread && <div className="w-2 h-2 rounded-full bg-ub-blue flex-shrink-0" />}
          </button>
        ))
      )}
    </div>
  )
}
