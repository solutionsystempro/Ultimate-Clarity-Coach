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

    // RAG: retrieve fewer chunks to keep input under Tier 1 budget.
    const context = await retrieveContext(lastUserMessage, 4)
    const systemBlocks = buildSystemBlocks(context, mentor || 'standard', profile || undefined)

    // Stream response from Claude.
    // System is passed as content blocks so the static prefix can be cached.
    // Cache reads do NOT count against input TPM rate limits.
    // max_tokens lowered to 1024 — Tier 1 caps output TPM at 8K, so 2048
    // would let only 4 messages/minute. 1024 doubles that to ~8.
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemBlocks,
      messages: messages.slice(-12),
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

        // Log final usage so we can verify caching and watch token spend.
        try {
          const finalMsg = await stream.finalMessage()
          console.log('Chat usage:', {
            input: finalMsg.usage?.input_tokens,
            output: finalMsg.usage?.output_tokens,
            cache_creation: finalMsg.usage?.cache_creation_input_tokens,
            cache_read: finalMsg.usage?.cache_read_input_tokens,
          })
        } catch {}

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
    const err = error as {
      status?: number
      message?: string
      name?: string
      error?: { type?: string; message?: string }
      headers?: Record<string, string> | Headers
    }
    const status = err?.status
    const apiType = err?.error?.type
    const apiMsg = err?.error?.message

    // Extract Anthropic rate-limit headers so we can name the failing dimension.
    const headersGet = (key: string): string | undefined => {
      const h = err?.headers
      if (!h) return undefined
      if (typeof (h as Headers).get === 'function') return (h as Headers).get(key) || undefined
      return (h as Record<string, string>)[key]
    }
    const inputRemaining = headersGet('anthropic-ratelimit-input-tokens-remaining')
    const outputRemaining = headersGet('anthropic-ratelimit-output-tokens-remaining')
    const requestsRemaining = headersGet('anthropic-ratelimit-requests-remaining')
    const retryAfter = headersGet('retry-after')

    console.error('Chat API error:', {
      name: err?.name,
      status,
      message: err?.message,
      apiType,
      apiMsg,
      inputRemaining,
      outputRemaining,
      requestsRemaining,
      retryAfter,
    })

    if (status === 401) {
      return NextResponse.json({ error: 'AI provider auth failed. Check ANTHROPIC_API_KEY / OPENAI_API_KEY in Vercel env.' }, { status: 500 })
    }
    if (status === 429 || apiType === 'rate_limit_error') {
      const dim =
        outputRemaining === '0' ? 'output tokens'
        : inputRemaining === '0' ? 'input tokens'
        : requestsRemaining === '0' ? 'requests'
        : 'tokens'
      const wait = retryAfter ? ` Retry in ~${retryAfter}s.` : ''
      return NextResponse.json(
        { error: `Anthropic rate limit hit (${dim}).${wait} Tier 1 caps: 30K input TPM / 8K output TPM / 50 RPM.` },
        { status: 503 }
      )
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
