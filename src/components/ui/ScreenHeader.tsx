'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export default function ScreenHeader({
  title,
  right,
  back = true,
}: {
  title: string
  right?: ReactNode
  back?: boolean
}) {
  const router = useRouter()
  return (
    <div className="sticky top-0 bg-white z-40 flex items-center justify-between px-4 py-3 border-b border-gray-100">
      {back ? (
        <button onClick={() => router.back()} className="text-gray-500 w-6">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="w-6" />
      )}
      <span className="text-sm font-medium">{title}</span>
      <div className="w-6 flex justify-end">{right}</div>
    </div>
  )
}
