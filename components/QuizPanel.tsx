'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/types/database'
import { Brain, CheckCircle, XCircle, Trophy } from 'lucide-react'

interface Props {
  questions: QuizQuestion[]
}

type Answers = Record<string, string>

export default function QuizPanel({ questions }: Props) {
  const [answers, setAnswers] = useState<Answers>({})
  const [submitted, setSubmitted] = useState(false)

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Brain className="w-10 h-10 text-slate-600 mb-4" />
        <h3 className="text-white font-medium mb-1">No quiz yet</h3>
        <p className="text-slate-400 text-sm">Quiz questions will appear here once processing is complete.</p>
      </div>
    )
  }

  const score = submitted
    ? questions.filter(q => answers[q.id] === q.correct_answer).length
    : 0
  const percent = submitted ? Math.round((score / questions.length) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      {submitted && (
        <div className={`rounded-2xl p-6 mb-8 flex items-center gap-4 ${
          percent >= 80 ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'
        }`}>
          <Trophy className={`w-8 h-8 ${percent >= 80 ? 'text-green-400' : 'text-yellow-400'}`} />
          <div>
            <p className="font-semibold text-white">
              {score}/{questions.length} correct — {percent}%
            </p>
            <p className="text-sm text-slate-400 mt-0.5">
              {percent >= 80 ? 'Great job! You know this material well.' : 'Review the notes and try again!'}
            </p>
          </div>
          <button
            onClick={() => { setAnswers({}); setSubmitted(false) }}
            className="ml-auto text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Retry
          </button>
        </div>
      )}

      <div className="space-y-6">
        {questions.map((q, i) => {
          const chosen = answers[q.id]
          const correct = q.correct_answer
          const isRight = chosen === correct
          const options = q.options as string[]

          return (
            <div key={q.id} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
              <p className="font-medium text-white mb-4">
                <span className="text-slate-500 mr-2">{i + 1}.</span>
                {q.question}
              </p>
              <div className="space-y-2.5">
                {options.map(opt => {
                  const isChosen = chosen === opt
                  const showCorrect = submitted && opt === correct
                  const showWrong = submitted && isChosen && !isRight

                  return (
                    <button
                      key={opt}
                      onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: opt }))}
                      disabled={submitted}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between gap-3 ${
                        showCorrect
                          ? 'bg-green-500/15 border border-green-500/30 text-green-300'
                          : showWrong
                          ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                          : isChosen
                          ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                          : 'bg-white/[0.04] border border-white/[0.07] text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.07]'
                      } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span>{opt}</span>
                      {showCorrect && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                      {showWrong && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < questions.length}
          className="mt-8 w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all"
        >
          Submit quiz ({Object.keys(answers).length}/{questions.length} answered)
        </button>
      )}
    </div>
  )
}
