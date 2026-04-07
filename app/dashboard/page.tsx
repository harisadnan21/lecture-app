import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import type { Lecture } from '@/types/database'
import AddContentModal from '@/components/AddContentModal'
import LectureCard from '@/components/LectureCard'
import ClientSignOut from '@/components/ClientSignOut'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: lectures } = await supabase
    .from('lectures')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const lectureCount = lectures?.filter(l => l.content_type !== 'meeting').length ?? 0
  const meetingCount = lectures?.filter(l => l.content_type === 'meeting').length ?? 0

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">LectureAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
            <ClientSignOut />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              {lectureCount} lecture{lectureCount !== 1 ? 's' : ''} · {meetingCount} meeting{meetingCount !== 1 ? 's' : ''}
            </p>
          </div>
          <AddContentModal />
        </div>

        {/* Content grid */}
        {!lectures || lectures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Nothing here yet</h3>
            <p className="text-slate-400 text-sm mb-6">
              Upload a lecture, record a meeting, or paste a transcript to get started.
            </p>
            <AddContentModal asButton />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(lectures as Lecture[]).map(lecture => (
              <LectureCard key={lecture.id} lecture={lecture} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
