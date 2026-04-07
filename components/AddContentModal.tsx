'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Upload, X, Plus, FileText, Mic, Monitor,
  Loader2, Square, Circle, BookOpen, Users, ChevronRight, ChevronLeft,
  AlertCircle, CheckCircle2, MousePointer2, Volume2, Chrome
} from 'lucide-react'
import toast from 'react-hot-toast'

type ContentType = 'lecture' | 'meeting'
type InputMode = 'upload' | 'transcript' | 'microphone' | 'screen'
type Step = 'type' | 'mode' | 'screen-instructions' | 'recording' | 'input'

interface AddContentModalProps {
  asButton?: boolean
}

export default function AddContentModal({ asButton }: AddContentModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('type')
  const [contentType, setContentType] = useState<ContentType>('lecture')
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [micError, setMicError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const resetState = () => {
    setStep('type')
    setContentType('lecture')
    setInputMode('upload')
    setTitle('')
    setFile(null)
    setTranscript('')
    setAudioBlob(null)
    setMicError(null)
    setRecordingTime(0)
    stopRecording()
  }

  const handleClose = () => {
    setOpen(false)
    resetState()
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
  }, [])

  useEffect(() => { return () => stopRecording() }, [stopRecording])

  const startMicRecording = async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      beginRecording(stream)
    } catch (err) {
      setMicError(err instanceof Error ? err.message : 'Microphone access denied')
    }
  }

  const startScreenRecording = async () => {
    setMicError(null)
    try {
      const stream = await (navigator.mediaDevices as MediaDevices & {
        getDisplayMedia: (opts: object) => Promise<MediaStream>
      }).getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false },
      })
      streamRef.current = stream

      // Stop video tracks immediately — we only want audio
      stream.getVideoTracks().forEach(t => t.stop())

      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach(t => t.stop())
        setMicError('no_audio_tracks')
        return
      }

      beginRecording(stream)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        setMicError(msg || 'Screen capture failed')
      }
    }
  }

  const beginRecording = (stream: MediaStream) => {
    chunksRef.current = []

    // Pick the best supported MIME type — order matters
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    const mimeType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) ?? ''

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      // Use the recorder's actual mimeType, not what we requested
      const actualType = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type: actualType })
      setAudioBlob(blob)
      setStep('input')
    }

    recorder.start(1000)
    setIsRecording(true)
    setRecordingTime(0)
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Add a title')
    const hasContent = inputMode === 'upload' ? !!file : inputMode === 'transcript' ? !!transcript.trim() : !!audioBlob
    if (!hasContent) return toast.error('No content to process')

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let fileUrl: string | undefined
      let finalFile = file

      if ((inputMode === 'microphone' || inputMode === 'screen') && audioBlob) {
        const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
        finalFile = new File([audioBlob], `recording.${ext}`, { type: audioBlob.type })
      }

      if (finalFile && inputMode !== 'transcript') {
        const ext = finalFile.name.split('.').pop() ?? 'webm'
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('lectures').upload(path, finalFile)
        if (uploadError) throw new Error(`Storage error: ${uploadError.message}`)
        fileUrl = supabase.storage.from('lectures').getPublicUrl(path).data.publicUrl
      }

      const { data: lecture, error: dbError } = await supabase
        .from('lectures')
        .insert({
          user_id: user.id,
          title: title.trim(),
          status: inputMode === 'transcript' ? 'processing' : 'transcribing',
          file_url: fileUrl ?? null,
          transcript: inputMode === 'transcript' ? transcript.trim() : null,
          content_type: contentType,
          source: inputMode,
        })
        .select().single()

      if (dbError) throw new Error(`Database error: ${dbError.message}`)

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureId: lecture.id,
          mode: inputMode === 'transcript' ? 'transcript' : 'file',
          fileUrl,
          transcript: inputMode === 'transcript' ? transcript.trim() : undefined,
          contentType,
        }),
      })

      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}))
        await supabase.from('lectures').delete().eq('id', lecture.id)
        if (errData.error === 'empty_transcript') {
          throw new Error(
            inputMode === 'screen'
              ? 'No meeting audio was captured. See the instructions on the previous screen and make sure to select the Chrome Tab option (not Window or Screen) and tick "Also share tab audio".'
              : 'No audio detected. Check your microphone and try again.'
          )
        }
        throw new Error(errData.details ?? 'Processing failed')
      }

      toast.success(`${contentType === 'meeting' ? 'Meeting' : 'Lecture'} added! Processing in background...`)
      handleClose()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const triggerButton = asButton ? (
    <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-medium transition-all text-sm">
      <Plus className="w-4 h-4" /> Add content
    </button>
  ) : (
    <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl font-medium transition-all text-sm">
      <Plus className="w-4 h-4" /> Add
    </button>
  )

  return (
    <>
      {triggerButton}

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                {(step === 'mode' || step === 'screen-instructions' || step === 'input') && (
                  <button
                    onClick={() => {
                      if (step === 'input' && (inputMode === 'microphone' || inputMode === 'screen')) setStep('screen-instructions')
                      else if (step === 'input') setStep('mode')
                      else if (step === 'screen-instructions') setStep('mode')
                      else setStep('type')
                    }}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="font-semibold text-white text-sm">
                  {step === 'type' && 'What are you adding?'}
                  {step === 'mode' && `How are you capturing this ${contentType}?`}
                  {step === 'screen-instructions' && 'How to capture meeting audio'}
                  {step === 'recording' && (isRecording ? 'Recording in progress' : 'Starting...')}
                  {step === 'input' && 'Add details'}
                </h2>
              </div>
              <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">

              {/* ── STEP 1: Type ───────────────────────────────────────── */}
              {step === 'type' && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'lecture' as ContentType, icon: <BookOpen className="w-6 h-6" />, label: 'Lecture', desc: 'Notes, flashcards, and a quiz', color: 'indigo' },
                    { type: 'meeting' as ContentType, icon: <Users className="w-6 h-6" />, label: 'Meeting', desc: 'Summary, action items, decisions', color: 'purple' },
                  ].map(opt => (
                    <button key={opt.type} onClick={() => { setContentType(opt.type); setStep('mode') }}
                      className="flex flex-col items-start gap-3 p-5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-indigo-500/40 hover:bg-white/[0.06] transition-all text-left group">
                      <div className={`w-10 h-10 rounded-xl bg-${opt.color}-500/10 border border-${opt.color}-500/20 flex items-center justify-center text-${opt.color}-400`}>{opt.icon}</div>
                      <div>
                        <p className="font-medium text-white mb-1">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 self-end mt-auto" />
                    </button>
                  ))}
                </div>
              )}

              {/* ── STEP 2: Mode ───────────────────────────────────────── */}
              {step === 'mode' && (
                <div className="space-y-2.5">
                  {[
                    { mode: 'upload' as InputMode, icon: <Upload className="w-4 h-4" />, label: 'Upload a file', desc: 'MP3, MP4, WAV, WEBM, or any audio/video file' },
                    { mode: 'transcript' as InputMode, icon: <FileText className="w-4 h-4" />, label: 'Paste a transcript', desc: 'Already have the text? Skip transcription entirely.' },
                    { mode: 'microphone' as InputMode, icon: <Mic className="w-4 h-4" />, label: 'Record from microphone', desc: 'Record live audio through your mic' },
                    ...(contentType === 'meeting' ? [{ mode: 'screen' as InputMode, icon: <Monitor className="w-4 h-4" />, label: 'Capture Google Meet or Zoom (browser)', desc: 'Records audio from a meeting tab in Chrome' }] : []),
                  ].map(opt => (
                    <button key={opt.mode}
                      onClick={() => {
                        setInputMode(opt.mode)
                        if (opt.mode === 'screen') setStep('screen-instructions')
                        else if (opt.mode === 'microphone') { setStep('recording'); startMicRecording() }
                        else setStep('input')
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-indigo-500/40 hover:bg-white/[0.05] transition-all text-left group">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all flex-shrink-0">{opt.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{opt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* ── STEP 3: Screen capture instructions ────────────────── */}
              {step === 'screen-instructions' && (
                <div className="space-y-5">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-sm text-amber-300 font-medium mb-1">⚠️ macOS limitation</p>
                    <p className="text-xs text-amber-400/90 leading-relaxed">
                      macOS blocks system audio capture in browsers. This <strong className="text-amber-200">only works when sharing a Chrome browser tab</strong> — not a window or your entire screen.
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white mb-3">Follow these steps exactly:</p>
                    <div className="space-y-3">
                      {[
                        { icon: <Chrome className="w-4 h-4" />, step: '1', title: 'Open your meeting in a Chrome tab', desc: 'Google Meet and Zoom web must be open in Chrome, not the desktop app.' },
                        { icon: <MousePointer2 className="w-4 h-4" />, step: '2', title: 'Click "Start recording" below', desc: 'Chrome will open a sharing dialog.' },
                        { icon: <Monitor className="w-4 h-4" />, step: '3', title: 'Select the "Tab" option at the top', desc: 'You\'ll see three tabs: Tab, Window, Screen. Click Tab — not Window or Screen.' },
                        { icon: <Volume2 className="w-4 h-4" />, step: '4', title: 'Check "Also share tab audio"', desc: 'This checkbox appears at the bottom of the dialog. This is what captures the meeting audio.' },
                        { icon: <CheckCircle2 className="w-4 h-4" />, step: '5', title: 'Click Share, then switch to your meeting', desc: 'Recording starts immediately. Come back here to stop when done.' },
                      ].map(s => (
                        <div key={s.step} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                            {s.icon}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{s.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => { setStep('recording'); startScreenRecording() }}
                    className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Monitor className="w-4 h-4" />
                    Start recording — select my meeting tab
                  </button>
                </div>
              )}

              {/* ── STEP 4: Recording ──────────────────────────────────── */}
              {step === 'recording' && (
                <div className="flex flex-col items-center py-4">
                  {micError ? (
                    <div className="w-full space-y-3">
                      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-300 mb-1">No audio captured</p>
                          {micError === 'no_audio_tracks' ? (
                            <p className="text-xs text-red-400/80 leading-relaxed">
                              Chrome didn&apos;t share any audio. Make sure you selected <strong className="text-red-200">Tab</strong> (not Window or Screen) and ticked <strong className="text-red-200">&quot;Also share tab audio&quot;</strong>.
                            </p>
                          ) : (
                            <p className="text-xs text-red-400/80">{micError}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => { setMicError(null); setStep('screen-instructions') }}
                        className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-2.5 rounded-xl text-sm font-medium transition-all">
                        Back to instructions
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative mb-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500/10' : 'bg-white/5'}`}>
                          {isRecording && <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />}
                          {inputMode === 'screen'
                            ? <Monitor className={`w-8 h-8 relative z-10 ${isRecording ? 'text-red-400' : 'text-slate-500'}`} />
                            : <Mic className={`w-8 h-8 relative z-10 ${isRecording ? 'text-red-400' : 'text-slate-500'}`} />}
                        </div>
                      </div>

                      <p className="text-3xl font-mono font-bold text-white mb-1">{formatTime(recordingTime)}</p>
                      <p className="text-sm text-slate-400 mb-2">
                        {isRecording
                          ? inputMode === 'screen' ? 'Capturing meeting audio — switch to your meeting tab now' : 'Recording from microphone...'
                          : 'Starting...'}
                      </p>

                      {isRecording && inputMode === 'screen' && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 mb-5 text-center">
                          <p className="text-xs text-green-300">
                            ✓ Audio is being captured. Switch to your meeting tab now.
                          </p>
                        </div>
                      )}

                      {isRecording && (
                        <button onClick={() => stopRecording()}
                          className="flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white px-6 py-3 rounded-xl font-medium transition-all mt-2">
                          <Square className="w-4 h-4 fill-white" />
                          Stop & process
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── STEP 5: Details ────────────────────────────────────── */}
              {step === 'input' && (
                <div className="space-y-4">
                  {audioBlob && (() => {
                    const sizeKB = audioBlob.size / 1024
                    const tooSmall = sizeKB < 8
                    const audioUrl = URL.createObjectURL(audioBlob)
                    return (
                      <div className={`rounded-xl border px-4 py-3 ${tooSmall ? 'bg-red-500/10 border-red-500/20' : 'bg-white/[0.04] border-white/10'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          {inputMode === 'microphone' ? <Mic className={`w-4 h-4 flex-shrink-0 ${tooSmall ? 'text-red-400' : 'text-slate-400'}`} /> : <Monitor className={`w-4 h-4 flex-shrink-0 ${tooSmall ? 'text-red-400' : 'text-slate-400'}`} />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${tooSmall ? 'text-red-300' : 'text-white'}`}>
                              {tooSmall ? 'Recording may be silent' : 'Recording captured'}
                            </p>
                            <p className={`text-xs mt-0.5 ${tooSmall ? 'text-red-400/70' : 'text-slate-500'}`}>
                              {formatTime(recordingTime)} · {sizeKB.toFixed(0)} KB
                              {tooSmall && ' — expected 50KB+ for real speech'}
                            </p>
                          </div>
                          <button onClick={() => { setAudioBlob(null); setStep(inputMode === 'screen' ? 'screen-instructions' : 'recording'); if (inputMode === 'microphone') startMicRecording() }}
                            className="text-xs text-slate-500 hover:text-white transition-colors flex-shrink-0">Re-record</button>
                        </div>

                        {/* Playback — lets user verify audio before submitting */}
                        <div>
                          <p className="text-xs text-slate-500 mb-1.5">Listen back to verify audio was captured:</p>
                          <audio controls src={audioUrl} className="w-full h-8" style={{ filter: 'invert(0.85) hue-rotate(180deg)' }} />
                        </div>

                        {tooSmall && (
                          <p className="text-xs text-red-400/80 mt-2 leading-relaxed">
                            {inputMode === 'microphone'
                              ? 'Check that your microphone is not muted and is selected as the input device in System Settings → Sound.'
                              : 'No meeting audio was captured. Go back and follow the Tab sharing instructions.'}
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">{contentType === 'meeting' ? 'Meeting name' : 'Lecture title'}</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus
                      placeholder={contentType === 'meeting' ? 'e.g. Product Sync – April 4' : 'e.g. Intro to ML – Week 3'}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm" />
                  </div>

                  {inputMode === 'upload' && (
                    <div>
                      <input ref={fileRef} type="file" accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.webm,.ogg" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl p-5 text-center transition-all group">
                        {file ? (
                          <div className="text-sm"><p className="text-white font-medium">{file.name}</p><p className="text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p></div>
                        ) : (
                          <div className="text-slate-500 group-hover:text-slate-300 transition-colors">
                            <Upload className="w-7 h-7 mx-auto mb-2 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            <p className="text-sm">Click to select audio or video</p>
                            <p className="text-xs mt-1 text-slate-600">MP3, MP4, M4A, WAV, WEBM</p>
                          </div>
                        )}
                      </button>
                    </div>
                  )}

                  {inputMode === 'transcript' && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Transcript</label>
                      <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={6}
                        placeholder={contentType === 'meeting' ? 'Paste the meeting transcript here...' : 'Paste the lecture transcript here...'}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm resize-none" />
                    </div>
                  )}

                  <button onClick={handleSubmit} disabled={loading}
                    className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Circle className="w-3 h-3 fill-white" />}
                    {loading ? 'Uploading...' : `Process ${contentType}`}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
