'use client'

import { useState } from 'react'
import type { Flashcard } from '@/types/database'
import { ChevronLeft, ChevronRight, RotateCcw, Zap } from 'lucide-react'

interface Props {
  flashcards: Flashcard[]
}

export default function FlashcardsPanel({ flashcards }: Props) {
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Zap className="w-10 h-10 text-slate-600 mb-4" />
        <h3 className="text-white font-medium mb-1">No flashcards yet</h3>
        <p className="text-slate-400 text-sm">Flashcards will appear here once processing is complete.</p>
      </div>
    )
  }

  const card = flashcards[current]
  const progress = ((current + 1) / flashcards.length) * 100

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-slate-400">{current + 1} / {flashcards.length}</span>
        <div className="flex-1 mx-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-slate-400">{flashcards.length} cards</span>
      </div>

      {/* Card */}
      <div
        className="cursor-pointer select-none"
        onClick={() => setFlipped(f => !f)}
        style={{ perspective: '1000px' }}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: '280px',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center justify-center text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-4">Concept</div>
            <p className="text-xl font-semibold text-white leading-relaxed">{card.front}</p>
            <p className="text-xs text-slate-500 mt-6">Click to reveal answer</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-4">Explanation</div>
            <p className="text-lg text-slate-200 leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false) }}
          disabled={current === 0}
          className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setFlipped(false)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          onClick={() => { setCurrent(c => Math.min(flashcards.length - 1, c + 1)); setFlipped(false) }}
          disabled={current === flashcards.length - 1}
          className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
