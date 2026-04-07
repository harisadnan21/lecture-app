import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function chunkText(text: string, chunkSize = 400, overlap = 50): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
    i += chunkSize - overlap
  }
  return chunks
}

export async function POST(req: NextRequest) {
  try {
    const { lectureId, mode, fileUrl, transcript: pastedTranscript, contentType = 'lecture' } = await req.json()

    if (!lectureId) {
      return NextResponse.json({ error: 'Missing lectureId' }, { status: 400 })
    }

    const supabase = createServiceClient()
    let transcript = pastedTranscript

    // ── STEP 1: Transcribe audio/video if needed ───────────────────────────
    if (mode === 'file' && fileUrl) {
      await supabase.from('lectures').update({ status: 'transcribing' }).eq('id', lectureId)

      const fileRes = await fetch(fileUrl)
      if (!fileRes.ok) throw new Error('Failed to fetch uploaded file')

      const blob = await fileRes.blob()
      const filename = fileUrl.split('/').pop() ?? 'audio.webm'
      const file = new File([blob], filename, { type: blob.type || 'audio/webm' })

      const whisperRes = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        response_format: 'text',
      })

      transcript = whisperRes
      await supabase.from('lectures').update({ transcript, status: 'processing' }).eq('id', lectureId)
    }

    if (!transcript || transcript.trim().length < 30) {
      await supabase.from('lectures').update({
        status: 'error',
        transcript: null,
      }).eq('id', lectureId)
      return NextResponse.json({
        error: 'empty_transcript',
        details: 'The recording contained no audio. For Google Meet/Zoom: share the browser tab (not your screen) and check "Also share tab audio". For mic recordings, check your microphone permissions.',
      }, { status: 400 })
    }

    await supabase.from('lectures').update({ status: 'processing', transcript }).eq('id', lectureId)

    if (contentType === 'meeting') {
      await processMeeting(supabase, lectureId, transcript)
    } else {
      await processLecture(supabase, lectureId, transcript)
    }

    await supabase.from('lectures').update({ status: 'ready' }).eq('id', lectureId)
    return NextResponse.json({ success: true })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Generate error:', message)
    return NextResponse.json({ error: 'Processing failed', details: message }, { status: 500 })
  }
}

// ── Lecture processing: notes + flashcards + quiz + embeddings ─────────────

async function processLecture(supabase: ReturnType<typeof createServiceClient>, lectureId: string, transcript: string) {
  const [notesCompletion, flashcardsCompletion, quizCompletion] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert academic note-taker. Generate comprehensive, well-structured markdown notes from lecture transcripts.
Use clear headings (##), bullet points, and **bold** for key terms.
Structure: ## Overview → ## Key Concepts → ## Detailed Notes → ## Summary.
Be thorough but concise. Highlight the most important concepts.`,
        },
        { role: 'user', content: `Generate structured notes from this lecture:\n\n${transcript.slice(0, 12000)}` },
      ],
      max_tokens: 2000,
    }),

    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Generate 8-10 flashcards from the lecture content. Return ONLY a JSON object:
{"flashcards": [{"front": "concept or term", "back": "clear explanation"}, ...]}
Front: a key term, concept, or question. Back: concise but complete explanation.`,
        },
        { role: 'user', content: `Create flashcards from:\n\n${transcript.slice(0, 10000)}` },
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),

    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Generate 5 multiple-choice quiz questions. Return ONLY valid JSON:
{"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "A"}, ...]}
All 4 options must be plausible. correct_answer must exactly match one of the options.`,
        },
        { role: 'user', content: `Create a quiz from:\n\n${transcript.slice(0, 10000)}` },
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  ])

  const notesContent = notesCompletion.choices[0]?.message?.content ?? ''

  let flashcardsData: Array<{ front: string; back: string }> = []
  try {
    const raw = JSON.parse(flashcardsCompletion.choices[0]?.message?.content ?? '{}')
    flashcardsData = raw.flashcards ?? raw.cards ?? (Array.isArray(raw) ? raw : [])
  } catch { flashcardsData = [] }

  let quizData: Array<{ question: string; options: string[]; correct_answer: string }> = []
  try {
    const raw = JSON.parse(quizCompletion.choices[0]?.message?.content ?? '{}')
    quizData = raw.questions ?? []
  } catch { quizData = [] }

  // Embeddings for RAG
  const embeddings = await generateEmbeddings(transcript)

  await Promise.all([
    supabase.from('notes').insert({ lecture_id: lectureId, content: notesContent }),
    flashcardsData.length > 0
      ? supabase.from('flashcards').insert(flashcardsData.map(f => ({ lecture_id: lectureId, front: f.front, back: f.back })))
      : Promise.resolve(),
    quizData.length > 0
      ? supabase.from('quiz_questions').insert(quizData.map(q => ({ lecture_id: lectureId, question: q.question, options: q.options, correct_answer: q.correct_answer })))
      : Promise.resolve(),
    embeddings.length > 0
      ? supabase.from('lecture_chunks').insert(embeddings.map(e => ({ lecture_id: lectureId, content: e.content, embedding: e.embedding })))
      : Promise.resolve(),
  ])
}

// ── Meeting processing: summary + action items + decisions + embeddings ─────

async function processMeeting(supabase: ReturnType<typeof createServiceClient>, lectureId: string, transcript: string) {
  const [summaryCompletion, structuredCompletion] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert meeting notes writer. Generate a clear, concise meeting summary in markdown.
Structure it exactly like this:

## Meeting Summary
2-3 sentence overview of the meeting purpose and outcome.

## Topics Discussed
- Topic 1: brief description
- Topic 2: brief description

## Key Decisions
- Decision made and context

## Action Items
- [ ] Action item — Owner (if mentioned)

## Next Steps
What was agreed upon for follow-up.

Be specific. Use names if mentioned. Keep it scannable.`,
        },
        { role: 'user', content: `Generate meeting notes from this transcript:\n\n${transcript.slice(0, 12000)}` },
      ],
      max_tokens: 2000,
    }),

    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Extract structured data from this meeting transcript. Return ONLY valid JSON:
{
  "action_items": [{"task": "...", "owner": "..." or null, "due": "..." or null}],
  "decisions": ["decision 1", "decision 2"],
  "attendees": ["name1", "name2"],
  "topics": ["topic 1", "topic 2"]
}`,
        },
        { role: 'user', content: `Extract from:\n\n${transcript.slice(0, 10000)}` },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  ])

  const summaryContent = summaryCompletion.choices[0]?.message?.content ?? ''

  let structured: { action_items?: unknown[]; decisions?: unknown[]; attendees?: unknown[]; topics?: unknown[] } = {}
  try {
    structured = JSON.parse(structuredCompletion.choices[0]?.message?.content ?? '{}')
  } catch { structured = {} }

  // Store summary as notes content, structured data as JSON in a second note
  const structuredNote = `\`\`\`json\n${JSON.stringify(structured, null, 2)}\n\`\`\``

  const embeddings = await generateEmbeddings(transcript)

  await Promise.all([
    supabase.from('notes').insert([
      { lecture_id: lectureId, content: summaryContent },
      { lecture_id: lectureId, content: structuredNote },
    ]),
    embeddings.length > 0
      ? supabase.from('lecture_chunks').insert(embeddings.map(e => ({ lecture_id: lectureId, content: e.content, embedding: e.embedding })))
      : Promise.resolve(),
  ])
}

// ── Shared: generate embeddings ────────────────────────────────────────────

async function generateEmbeddings(transcript: string) {
  const chunks = chunkText(transcript)
  const embeddings: { content: string; embedding: number[] }[] = []

  for (let i = 0; i < Math.min(chunks.length, 50); i += 10) {
    const batch = chunks.slice(i, i + 10)
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })
    for (let j = 0; j < batch.length; j++) {
      embeddings.push({ content: batch[j], embedding: embRes.data[j].embedding })
    }
  }

  return embeddings
}
