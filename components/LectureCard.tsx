'use client'

import Link from 'next/link'
import { Lecture } from '@/types/database'
import { BookOpen, Users, Clock, CheckCircle, AlertCircle, Loader2, FileText, Mic, Monitor, Upload } from 'lucide-react'

const statusConfig = {
  pending: { label: 'Queued', color: 'text-slate-400', bg: 'bg-slate-800', icon: Clock },
  transcribing: { label: 'Transcribing...', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Loader2 },
  processing: { label: 'Generating...', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Loader2 },
  ready: { label: 'Ready', color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle },
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-400/10', icon: AlertCircle },
}

const sourceIcon = {
  upload: Upload,
  transcript: FileText,
  microphone: Mic,
  screen: Monitor,
}

const sourceLabel = {
  upload: 'File upload',
  transcript: 'Transcript',
  microphone: 'Mic recording',
  screen: 'Screen capture',
}

export default function LectureCard({ lecture }: { lecture: Lecture }) {
  const status = statusConfig[lecture.status]
  const StatusIcon = status.icon
  const SourceIcon = sourceIcon[lecture.source] ?? Upload
  const isProcessing = lecture.status === 'transcribing' || lecture.status === 'processing'
  const isMeeting = lecture.content_type === 'meeting'

  const date = new Date(lecture.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <Link
      href={lecture.status === 'ready' ? `/lecture/${lecture.id}` : '#'}
      className={`block bg-white/[0.03] border rounded-2xl p-5 transition-all group ${
        lecture.status !== 'ready'
          ? 'cursor-default border-white/[0.07]'
          : isMeeting
            ? 'hover:border-purple-500/30 hover:bg-white/[0.05] border-white/[0.07]'
            : 'hover:border-indigo-500/30 hover:bg-white/[0.05] border-white/[0.07]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isMeeting
            ? 'bg-purple-500/10 border border-purple-500/20'
            : 'bg-indigo-500/10 border border-indigo-500/20'
        }`}>
          {isMeeting
            ? <Users className="w-5 h-5 text-purple-400" />
            : <BookOpen className="w-5 h-5 text-indigo-400" />
          }
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
          <StatusIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
          {status.label}
        </div>
      </div>

      <div className="mb-1">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isMeeting ? 'bg-purple-500/10 text-purple-400' : 'bg-indigo-500/10 text-indigo-400'
        }`}>
          {isMeeting ? 'Meeting' : 'Lecture'}
        </span>
      </div>

      <h3 className={`font-medium text-white mt-2 mb-1 line-clamp-2 transition-colors ${
        isMeeting ? 'group-hover:text-purple-300' : 'group-hover:text-indigo-300'
      }`}>
        {lecture.title}
      </h3>

      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {date}
        </span>
        <span className="flex items-center gap-1">
          <SourceIcon className="w-3 h-3" />
          {sourceLabel[lecture.source] ?? 'Upload'}
        </span>
      </div>
    </Link>
  )
}
