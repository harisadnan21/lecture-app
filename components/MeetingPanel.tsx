'use client'

import ReactMarkdown from 'react-markdown'
import type { Note, Lecture } from '@/types/database'
import { CheckSquare, Lightbulb, Users, FileText, Loader2, AlertCircle } from 'lucide-react'
import { useMemo } from 'react'

interface ActionItem { task: string; owner?: string | null; due?: string | null }
interface MeetingStructured {
  action_items?: ActionItem[]
  decisions?: string[]
  attendees?: string[]
  topics?: string[]
}

interface Props {
  notes: Note[]
  lecture: Lecture
}

function parseStructured(notes: Note[]): MeetingStructured | null {
  const structuredNote = notes.find(n => n.content.startsWith('```json'))
  if (!structuredNote) return null
  try {
    const json = structuredNote.content.replace(/^```json\n/, '').replace(/\n```$/, '')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export default function MeetingPanel({ notes, lecture }: Props) {
  if (lecture.status === 'transcribing' || lecture.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <h3 className="text-white font-medium mb-1">
          {lecture.status === 'transcribing' ? 'Transcribing audio...' : 'Generating meeting notes...'}
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

  const summaryNote = notes.find(n => !n.content.startsWith('```json'))
  const structured = parseStructured(notes)

  if (!summaryNote) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-10 h-10 text-slate-600 mb-4" />
        <h3 className="text-white font-medium mb-2">No meeting notes yet</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          Notes will appear here once processing is complete. If this meeting shows as &quot;Ready&quot; but notes are missing, the recording may not have captured audio — try again and make sure to share the tab with audio enabled.
        </p>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">

      {/* Left: Summary (full markdown) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Meeting Notes
          </h2>
          <div className="prose max-w-none">
            <ReactMarkdown>{summaryNote?.content ?? '*Notes are being generated...*'}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Right: Structured sidebar */}
      <div className="space-y-4">

        {/* Action Items */}
        {structured?.action_items && structured.action_items.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
              <CheckSquare className="w-4 h-4 text-green-400" />
              Action Items
            </h3>
            <div className="space-y-2.5">
              {structured.action_items.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded border border-white/20 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 leading-snug">{item.task}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.owner && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                          {item.owner}
                        </span>
                      )}
                      {item.due && (
                        <span className="text-xs text-slate-500">{item.due}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Decisions */}
        {structured?.decisions && structured.decisions.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Key Decisions
            </h3>
            <ul className="space-y-2">
              {structured.decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Attendees */}
        {structured?.attendees && structured.attendees.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-slate-400" />
              People Mentioned
            </h3>
            <div className="flex flex-wrap gap-2">
              {structured.attendees.map((a, i) => (
                <span key={i} className="text-xs bg-white/[0.06] border border-white/[0.08] text-slate-300 px-2.5 py-1 rounded-full">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        {lecture.transcript && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="font-medium text-white mb-3 text-sm">Transcript</h3>
            <div className="text-xs text-slate-400 leading-relaxed max-h-48 overflow-y-auto pr-1">
              {lecture.transcript}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
