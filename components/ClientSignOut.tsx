'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function ClientSignOut() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
    >
      <LogOut className="w-4 h-4" />
      Sign out
    </button>
  )
}
