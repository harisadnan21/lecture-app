'use client'

import Link from 'next/link'
import { BookOpen, Zap, Brain, MessageSquare, Upload, ChevronRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">LectureAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
              Log in
            </Link>
            <Link href="/auth/signup" className="text-sm bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg transition-colors font-medium">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-400 text-sm mb-6">
            <Zap className="w-3.5 h-3.5" />
            Powered by GPT-4o + Whisper
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Turn any lecture into
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400"> instant knowledge</span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload a lecture recording or paste a transcript. Get structured notes, flashcards, a quiz, and an AI tutor — all in under a minute.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105">
              Start for free
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 px-6 py-3 rounded-xl font-medium transition-all">
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Everything you need to study smarter</h2>
            <p className="text-slate-400">Four tools, one upload.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <BookOpen className="w-5 h-5" />,
                title: 'Structured Notes',
                desc: 'Auto-generated markdown notes with headings, key concepts, and bullet points.',
                color: 'indigo',
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: 'Flashcards',
                desc: '5–10 flashcards per lecture. Front is concept, back is explanation.',
                color: 'purple',
              },
              {
                icon: <Brain className="w-5 h-5" />,
                title: 'Quiz',
                desc: '5 multiple-choice questions to test your understanding right away.',
                color: 'pink',
              },
              {
                icon: <MessageSquare className="w-5 h-5" />,
                title: 'AI Tutor',
                desc: 'Chat with an AI that only answers using your lecture content.',
                color: 'cyan',
              },
            ].map((f, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:border-white/[0.12] transition-all">
                <div className={`w-10 h-10 rounded-xl bg-${f.color}-500/10 border border-${f.color}-500/20 flex items-center justify-center text-${f.color}-400 mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: <Upload className="w-6 h-6" />, title: 'Upload or paste', desc: 'Drop an audio/video file or paste a raw transcript.' },
              { step: '2', icon: <Zap className="w-6 h-6" />, title: 'AI processes it', desc: 'Whisper transcribes, GPT-4o generates notes, cards, and quiz.' },
              { step: '3', icon: <Brain className="w-6 h-6" />, title: 'Study smarter', desc: 'Review notes, flip cards, take the quiz, and chat with your tutor.' },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
                  {s.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to study smarter?</h2>
          <p className="text-slate-400 mb-8">Upload your first lecture in under 60 seconds.</p>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105">
            Get started free
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} LectureAI
      </footer>
    </div>
  )
}
