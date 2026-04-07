'use client'

import ReactMarkdown from 'react-markdown'
import type { Note, Lecture } from '@/types/database'
import { FileText, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  notes: Note[]
  lecture: Lecture
}

export default function NotesPanel({ notes, lecture }: Props) {
  if (lecture.status === 'transcribing' || lecture.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <h3 className="text-white font-medium mb-1">
          {lecture.status === 'transcribing' ? 'Transcribing audio...' : 'Generating notes...'}
        </h3>
        <p className="text-slate-400 text-sm">This usually takes 1–2 minutes. Refresh to check.</p>
      </div>
    )
  }

  if (lecture.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h3 className="text-white font-medium mb-1">Processing failed</h3>
        <p className="text-slate-400 text-sm">Something went wrong. Please try uploading again.</p>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-10 h-10 text-slate-600 mb-4" />
        <h3 className="text-white font-medium mb-1">No notes yet</h3>
        <p className="text-slate-400 text-sm">Notes are being generated...</p>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Notes */}
      <div className="lg:col-span-2">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Lecture Notes
          </h2>
          <div className="prose max-w-none">
            <ReactMarkdown>{notes[0]?.content ?? ''}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {lecture.transcript && (
        <div className="lg:col-span-1">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 sticky top-24">
            <h3 className="font-medium text-white mb-3 text-sm">Transcript</h3>
            <div className="text-xs text-slate-400 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              {lecture.transcript}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
