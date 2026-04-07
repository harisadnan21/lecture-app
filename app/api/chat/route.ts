import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { lectureId, question } = await req.json()

    if (!lectureId || !question) {
      return NextResponse.json({ error: 'Missing lectureId or question' }, { status: 400 })
    }

    // Verify user owns this lecture
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: lecture } = await supabase
      .from('lectures')
      .select('id, user_id, transcript')
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .single()

    if (!lecture) return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })

    // Generate embedding for the question
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    })
    const queryEmbedding = embRes.data[0].embedding

    // Try vector search first (lower threshold to catch more matches)
    const serviceClient = createServiceClient()
    const { data: chunks, error: matchError } = await serviceClient.rpc('match_lecture_chunks', {
      query_embedding: queryEmbedding,
      match_lecture_id: lectureId,
      match_threshold: 0.2,
      match_count: 6,
    })

    if (matchError) {
      console.error('Match error:', matchError)
    }

    // Build context: prefer vector chunks, fall back to raw transcript
    let context: string
    let contextSource: 'rag' | 'transcript' | 'none'

    if (chunks && chunks.length > 0) {
      context = chunks.map((c: { content: string }) => c.content).join('\n\n---\n\n')
      contextSource = 'rag'
    } else if (lecture.transcript) {
      // Fallback: use the full transcript (truncated to fit context window)
      context = lecture.transcript.slice(0, 14000)
      contextSource = 'transcript'
    } else {
      context = ''
      contextSource = 'none'
    }

    // Generate AI response
    let systemPrompt: string

    if (contextSource === 'none') {
      systemPrompt = `You are an AI tutor. No transcript is available for this lecture yet. Let the student know and suggest they wait for processing to finish.`
    } else {
      systemPrompt = `You are an AI tutor helping a student understand their lecture.
Answer questions using ONLY the lecture content provided below. Be specific and cite details from the lecture.
If the answer genuinely isn't in the lecture, say: "That specific detail wasn't covered in this lecture."
Keep answers clear and focused. Do not make up information.

LECTURE CONTENT:
${context}`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      max_tokens: 700,
      temperature: 0.2,
    })

    const answer = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.'

    return NextResponse.json({ answer, contextSource })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
