'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { sendMessage, conversationId } from '@/lib/messages'
import type { MessageRow, UserRow } from '@/lib/types'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Avatar from '@/components/ui/Avatar'

export default function ChatPage() {
  const { otherId } = useParams<{ otherId: string }>()
  const { user: me } = useAuth()
  const [other, setOther] = useState<UserRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  const convo = me ? conversationId(me.id, otherId) : ''

  const load = useCallback(async () => {
    if (!me) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convo)
      .order('created_at', { ascending: true })
    setMessages((data as MessageRow[]) ?? [])
    // Mark received messages as read.
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', convo)
      .eq('receiver_id', me.id)
      .is('read_at', null)
  }, [me, convo])

  useEffect(() => {
    supabase.from('users').select('*').eq('id', otherId).maybeSingle().then(({ data }) => setOther(data as UserRow))
  }, [otherId])

  useEffect(() => {
    if (!me) return
    load()
    const channel = supabase
      .channel(`chat-${convo}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convo}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [me, convo, load])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!me || !text.trim()) return
    setSending(true)
    const content = text.trim()
    setText('')
    try {
      await sendMessage({ senderId: me.id, receiverId: otherId, content })
      await load()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <ScreenHeader
        title={other?.display_name ?? 'Chat'}
        right={other ? <Avatar user={other} size={28} /> : undefined}
      />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
        {messages.map((m) => {
          const mine = m.sender_id === me?.id
          return (
            <div
              key={m.id}
              className={`max-w-[78%] px-3 py-2 rounded-2xl ${
                mine
                  ? 'self-end bg-ub-blue text-white rounded-br-md'
                  : 'self-start bg-gray-100 text-gray-800 rounded-bl-md'
              }`}
            >
              <div className="text-sm">{m.content}</div>
              <div className={`text-[10px] mt-0.5 ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      <div className="flex gap-2 p-3 border-t border-gray-100">
        <input
          className="input rounded-full"
          placeholder="Message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="btn btn-primary rounded-full px-3.5" onClick={send} disabled={sending}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
