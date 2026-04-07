import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'
import ClientSignOut from '@/components/ClientSignOut'
import LectureDetailClient from '@/components/LectureDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LectureDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: lecture } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!lecture) notFound()

  const [{ data: notes }, { data: flashcards }, { data: quiz }, { data: messages }] = await Promise.all([
    supabase.from('notes').select('*').eq('lecture_id', id).order('created_at'),
    supabase.from('flashcards').select('*').eq('lecture_id', id).order('created_at'),
    supabase.from('quiz_questions').select('*').eq('lecture_id', id).order('created_at'),
    supabase.from('chat_messages').select('*').eq('lecture_id', id).order('created_at'),
  ])

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-medium text-white text-sm truncate max-w-[300px]">{lecture.title}</span>
            </div>
          </div>
          <ClientSignOut />
        </div>
      </nav>

      <LectureDetailClient
        lecture={lecture}
        initialNotes={notes ?? []}
        initialFlashcards={flashcards ?? []}
        initialQuiz={quiz ?? []}
        initialMessages={messages ?? []}
        userId={user.id}
      />
    </div>
  )
}
