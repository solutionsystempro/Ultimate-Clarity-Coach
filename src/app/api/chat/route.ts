import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@clerk/nextjs/server'
import { retrieveContext, buildSystemPrompt } from '@/lib/rag'
import { createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FREE_DAILY_LIMIT = 5

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, conversationId, mentor } = await req.json()
    const supabase = createServiceClient()

    // Get or create user record
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ id: userId, email: '' })
        .select()
        .single()
      user = newUser
    }

    // Check daily message limit for free users
    if (user?.plan === 'free') {
      const today = new Date().toDateString()
      const resetDate = new Date(user.messages_reset_at).toDateString()

      if (today !== resetDate) {
        await supabase
          .from('users')
          .update({ messages_used_today: 0, messages_reset_at: new Date().toISOString() })
          .eq('id', userId)
        user.messages_used_today = 0
      }

      if (user.messages_used_today >= FREE_DAILY_LIMIT) {
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
    const systemPrompt = buildSystemPrompt(context, mentor || 'standard', profile || undefined)

    // Stream response from Claude
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.slice(-20), // keep last 20 messages for context
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
    if (user?.plan === 'free') {
      await supabase
        .from('users')
        .update({ messages_used_today: (user.messages_used_today || 0) + 1 })
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
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
