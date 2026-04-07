'use client'

import { useState } from 'react'
import { FileText, Zap, Brain, MessageSquare, Users } from 'lucide-react'
import type { Lecture, Note, Flashcard, QuizQuestion, ChatMessage } from '@/types/database'
import NotesPanel from '@/components/NotesPanel'
import FlashcardsPanel from '@/components/FlashcardsPanel'
import QuizPanel from '@/components/QuizPanel'
import ChatPanel from '@/components/ChatPanel'
import MeetingPanel from '@/components/MeetingPanel'

type LectureTab = 'notes' | 'flashcards' | 'quiz' | 'chat'
type MeetingTab = 'summary' | 'chat'
type ActiveTab = LectureTab | MeetingTab

interface Props {
  lecture: Lecture
  initialNotes: Note[]
  initialFlashcards: Flashcard[]
  initialQuiz: QuizQuestion[]
  initialMessages: ChatMessage[]
  userId: string
}

const lectureTabs = [
  { id: 'notes' as const, label: 'Notes', icon: <FileText className="w-4 h-4" /> },
  { id: 'flashcards' as const, label: 'Flashcards', icon: <Zap className="w-4 h-4" /> },
  { id: 'quiz' as const, label: 'Quiz', icon: <Brain className="w-4 h-4" /> },
  { id: 'chat' as const, label: 'AI Tutor', icon: <MessageSquare className="w-4 h-4" /> },
]

const meetingTabs = [
  { id: 'summary' as const, label: 'Meeting Notes', icon: <Users className="w-4 h-4" /> },
  { id: 'chat' as const, label: 'AI Tutor', icon: <MessageSquare className="w-4 h-4" /> },
]

export default function LectureDetailClient({
  lecture,
  initialNotes,
  initialFlashcards,
  initialQuiz,
  initialMessages,
  userId,
}: Props) {
  const isMeeting = lecture.content_type === 'meeting'
  const tabs = isMeeting ? meetingTabs : lectureTabs
  const [activeTab, setActiveTab] = useState<ActiveTab>(isMeeting ? 'summary' : 'notes')

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 w-fit mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? isMeeting
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="fade-in">
        {activeTab === 'summary' && <MeetingPanel notes={initialNotes} lecture={lecture} />}
        {activeTab === 'notes' && <NotesPanel notes={initialNotes} lecture={lecture} />}
        {activeTab === 'flashcards' && <FlashcardsPanel flashcards={initialFlashcards} />}
        {activeTab === 'quiz' && <QuizPanel questions={initialQuiz} />}
        {activeTab === 'chat' && (
          <ChatPanel
            lectureId={lecture.id}
            userId={userId}
            initialMessages={initialMessages}
          />
        )}
      </div>
    </div>
  )
}
