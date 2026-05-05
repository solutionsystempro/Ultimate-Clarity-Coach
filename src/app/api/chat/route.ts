import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'
import { retrieveContext, buildSystemBlocks } from '@/lib/rag'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FREE_DAILY_LIMIT = 5

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createAuthClient(req)
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id

    const { messages, conversationId, mentor } = await req.json()
    const supabase = createServiceClient()

    // Get or create user record
    let { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!dbUser) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ id: userId, email: user.email || '' })
        .select()
        .single()
      dbUser = newUser
    }

    // Check daily message limit for free users
    if (dbUser?.plan === 'free') {
      const today = new Date().toDateString()
      const resetDate = new Date(dbUser.messages_reset_at).toDateString()

      if (today !== resetDate) {
        await supabase
          .from('users')
          .update({ messages_used_today: 0, messages_reset_at: new Date().toISOString() })
          .eq('id', userId)
        dbUser.messages_used_today = 0
      }

      if (dbUser.messages_used_today >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: 'Daily limit reached. Upgrade to Premium for unlimited coaching.' },
          { status: 429 }
        )
      }
    }

    const lastUserMessage = messages[messages.length - 1]?.content || ''

    // Get business profile for personalized coaching
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    // RAG: retrieve relevant knowledge base chunks
    const context = await retrieveContext(lastUserMessage)
    const systemBlocks = buildSystemBlocks(context, mentor || 'standard', profile || undefined)

    // Stream response from Claude.
    // System is passed as content blocks so the static prefix can be cached.
    // Cache reads do NOT count against input TPM rate limits.
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemBlocks,
      messages: messages.slice(-20),
    })

    // Save user message to DB
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastUserMessage,
        sources: context.map(c => ({ id: c.id, source_file: c.source_file, similarity: c.similarity })),
      })
    }

    // Increment usage counter for free users
    if (dbUser?.plan === 'free') {
      await supabase
        .from('users')
        .update({ messages_used_today: (dbUser.messages_used_today || 0) + 1 })
        .eq('id', userId)
    }

    // Return streaming response
    const textStream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullResponse += text
            controller.enqueue(new TextEncoder().encode(text))
          }
        }

        // Save assistant message to DB
        if (conversationId) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
          })
        }

        controller.close()
      },
    })

    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    const err = error as { status?: number; message?: string; name?: string; error?: { type?: string; message?: string } }
    const status = err?.status
    const apiType = err?.error?.type
    const apiMsg = err?.error?.message
    console.error('Chat API error:', {
      name: err?.name,
      status,
      message: err?.message,
      apiType,
      apiMsg,
    })

    if (status === 401) {
      return NextResponse.json({ error: 'AI provider auth failed. Check ANTHROPIC_API_KEY / OPENAI_API_KEY in Vercel env.' }, { status: 500 })
    }
    if (status === 429 || apiType === 'rate_limit_error') {
      return NextResponse.json({ error: 'AI provider rate limit hit. Try again in a moment.' }, { status: 503 })
    }
    if (apiType === 'insufficient_quota' || apiType === 'billing_hard_limit_reached' || /credit|quota|billing/i.test(apiMsg || err?.message || '')) {
      return NextResponse.json({ error: 'AI provider out of credits. Top up Anthropic or OpenAI billing.' }, { status: 503 })
    }

    return NextResponse.json(
      { error: apiMsg || err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
