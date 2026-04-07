'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage } from '@/types/database'
import { Send, Loader2, Bot, User, MessageSquare } from 'lucide-react'

interface Props {
  lectureId: string
  userId: string
  initialMessages: ChatMessage[]
}

export default function ChatPanel({ lectureId, userId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      lecture_id: lectureId,
      user_id: userId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(m => [...m, userMsg])

    // Save user message
    await supabase.from('chat_messages').insert({
      lecture_id: lectureId,
      user_id: userId,
      role: 'user',
      content: text,
    })

    // Get AI response
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lectureId, question: text }),
    })

    const data = await res.json()
    const answer = data.answer ?? 'Sorry, I could not generate a response.'

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      lecture_id: lectureId,
      user_id: userId,
      role: 'assistant',
      content: answer,
      created_at: new Date().toISOString(),
    }
    setMessages(m => [...m, aiMsg])

    // Save AI message
    await supabase.from('chat_messages').insert({
      lecture_id: lectureId,
      user_id: userId,
      role: 'assistant',
      content: answer,
    })

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-indigo-400" />
            </div>
            <h3 className="font-medium text-white mb-2">Ask your AI tutor</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              I&apos;ll answer questions strictly from this lecture&apos;s content. If the answer isn&apos;t in the lecture, I&apos;ll say so.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-500 text-white rounded-tr-sm'
                    : 'bg-white/[0.05] border border-white/[0.08] text-slate-200 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-white/[0.05] border border-white/[0.08] px-4 py-3 rounded-2xl rounded-tl-sm">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="mt-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask something about this lecture..."
          disabled={loading}
          className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-12 h-12 flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  )
}
