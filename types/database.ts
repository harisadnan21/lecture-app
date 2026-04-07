export interface Lecture {
  id: string
  user_id: string
  title: string
  transcript: string | null
  file_url: string | null
  status: 'pending' | 'transcribing' | 'processing' | 'ready' | 'error'
  content_type: 'lecture' | 'meeting'
  source: 'upload' | 'transcript' | 'microphone' | 'screen'
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  lecture_id: string
  content: string
  created_at: string
}

export interface Flashcard {
  id: string
  lecture_id: string
  front: string
  back: string
  created_at: string
}

export interface QuizQuestion {
  id: string
  lecture_id: string
  question: string
  options: string[]
  correct_answer: string
  created_at: string
}

export interface ChatMessage {
  id: string
  lecture_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
