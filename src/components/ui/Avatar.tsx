import type { UserRow } from '@/lib/types'

// Shows the user's photo if they added one, otherwise their animal-emoji avatar.
export default function Avatar({
  user,
  size = 36,
}: {
  user?: Pick<UserRow, 'avatar_emoji' | 'photo_url' | 'display_name'> | null
  size?: number
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.5) }
  if (user?.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photo_url}
        alt={user.display_name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
      style={style}
    >
      {user?.avatar_emoji ?? '👤'}
    </div>
  )
}
