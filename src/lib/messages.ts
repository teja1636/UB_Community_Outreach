import { supabase } from './supabase'

// Deterministic conversation id for a pair of users (matches the generated
// column in the DB: smaller uuid first).
export function conversationId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

export async function sendMessage({
  senderId,
  receiverId,
  postId,
  content,
}: {
  senderId: string
  receiverId: string
  postId?: string | null
  content: string
}) {
  const { error } = await supabase.from('messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    post_id: postId ?? null,
    content,
  })
  if (error) throw new Error(error.message)
}
