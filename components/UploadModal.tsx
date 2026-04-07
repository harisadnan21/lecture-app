'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, X, Plus, FileAudio, FileText, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface UploadModalProps {
  asButton?: boolean
}

export default function UploadModal({ asButton }: UploadModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'file' | 'transcript'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Add a title')
    if (mode === 'file' && !file) return toast.error('Select a file')
    if (mode === 'transcript' && !transcript.trim()) return toast.error('Paste a transcript')

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let fileUrl: string | undefined

      // Upload file to Supabase Storage
      if (mode === 'file' && file) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('lectures')
          .upload(path, file)

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }
        const { data: urlData } = supabase.storage.from('lectures').getPublicUrl(path)
        fileUrl = urlData.publicUrl
      }

      // Create lecture record
      const { data: lecture, error: dbError } = await supabase
        .from('lectures')
        .insert({
          user_id: user.id,
          title: title.trim(),
          status: mode === 'transcript' ? 'processing' : 'transcribing',
          file_url: fileUrl ?? null,
          transcript: mode === 'transcript' ? transcript.trim() : null,
        })
        .select()
        .single()

      if (dbError) {
        console.error('DB insert error:', dbError)
        throw new Error(`Database error: ${dbError.message}`)
      }

      // Trigger background processing
      await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureId: lecture.id,
          mode,
          fileUrl,
          transcript: mode === 'transcript' ? transcript.trim() : undefined,
        }),
      })

      toast.success('Lecture added! Processing in the background...')
      setOpen(false)
      setTitle('')
      setFile(null)
      setTranscript('')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const trigger = asButton ? (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-medium transition-all text-sm"
    >
      <Plus className="w-4 h-4" />
      Upload lecture
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl font-medium transition-all text-sm"
    >
      <Upload className="w-4 h-4" />
      Upload lecture
    </button>
  )

  return (
    <>
      {trigger}

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="font-semibold text-white">Add lecture</h2>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Intro to Machine Learning – Week 3"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                />
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    mode === 'file' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileAudio className="w-4 h-4" />
                  Audio / Video
                </button>
                <button
                  type="button"
                  onClick={() => setMode('transcript')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    mode === 'transcript' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Transcript
                </button>
              </div>

              {/* Input */}
              {mode === 'file' ? (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.webm,.ogg"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-xl p-6 text-center transition-all group"
                  >
                    {file ? (
                      <div className="text-sm">
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 group-hover:text-slate-300 transition-colors">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        <p>Click to select audio or video</p>
                        <p className="text-xs mt-1 text-slate-600">MP3, MP4, M4A, WAV, WEBM</p>
                      </div>
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Transcript</label>
                  <textarea
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    placeholder="Paste the lecture transcript here..."
                    rows={6}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm resize-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading ? 'Uploading...' : 'Upload & process'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
