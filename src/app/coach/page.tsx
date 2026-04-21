'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import {
  Send, Plus, MessageSquare, Trash2, User as UserIcon, LogOut,
  ChevronLeft, ChevronRight, Sparkles, Settings, Users, Download, FileText, BarChart2,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// ─── One-Sheeter Renderer ───────────────────────────────────
function OneSheeterCard({ content }: { content: string }) {
  function handleDownload() {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'offer-one-sheeter.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadHTML() {
    // Build a clean styled HTML version
    const lines = content.split('\n')
    const htmlLines = lines.map(line => {
      if (line.startsWith('## ')) return `<h1>${line.replace('## ', '')}</h1>`
      if (line.startsWith('### ')) return `<h2>${line.replace('### ', '')}</h2>`
      if (line.startsWith('> ')) return `<blockquote>${line.replace('> ', '')}</blockquote>`
      if (line.startsWith('• ') || line.startsWith('- ')) return `<li>${line.replace(/^[•\-] /, '')}</li>`
      if (line.match(/^\d\. /)) return `<li>${line.replace(/^\d\. /, '')}</li>`
      if (line.trim() === '') return '<br/>'
      return `<p>${line}</p>`
    })
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Offer One-Sheeter</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 60px auto; padding: 0 30px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 2em; border-bottom: 3px solid #aaff00; padding-bottom: 12px; margin-bottom: 24px; }
  h2 { font-size: 1.3em; color: #aaff00; margin-top: 32px; margin-bottom: 8px; }
  blockquote { border-left: 4px solid #aaff00; padding: 12px 20px; background: #f5ffe0; font-size: 1.1em; font-weight: bold; margin: 20px 0; }
  li { margin: 4px 0; }
  p strong { font-weight: 700; }
  @media print { body { margin: 20px; } }
</style></head>
<body>${htmlLines.join('\n')}</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'offer-one-sheeter.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-3 rounded-2xl border border-[rgba(170,255,0,0.30)] bg-[rgba(170,255,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(170,255,0,0.15)]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-accent">Offer One-Sheeter Ready</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-neutral-300 hover:text-white transition-all border border-white/10"
          >
            <Download className="w-3 h-3" /> MD
          </button>
          <button
            onClick={handleDownloadHTML}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:opacity-90 text-xs text-black font-semibold transition-all"
          >
            <Download className="w-3 h-3" /> Download
          </button>
        </div>
      </div>
      <div className="px-4 py-4 text-sm chat-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

// ─── Message content parser — detects One-Sheeter blocks ────
function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const START = '===ONE-SHEETER-START==='
  const END = '===ONE-SHEETER-END==='
  const startIdx = content.indexOf(START)
  const endIdx = content.indexOf(END)

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = content.substring(0, startIdx).trim()
    const sheetContent = content.substring(startIdx + START.length, endIdx).trim()
    const after = content.substring(endIdx + END.length).trim()
    return (
      <div>
        {before && <div className="chat-prose text-sm mb-2"><ReactMarkdown remarkPlugins={[remarkGfm]}>{before}</ReactMarkdown></div>}
        <OneSheeterCard content={sheetContent} />
        {after && <div className="chat-prose text-sm mt-3"><ReactMarkdown remarkPlugins={[remarkGfm]}>{after}</ReactMarkdown></div>}
      </div>
    )
  }

  // Still streaming the one-sheeter — show progress indicator
  if (startIdx !== -1 && endIdx === -1 && isStreaming) {
    const before = content.substring(0, startIdx).trim()
    const partial = content.substring(startIdx + START.length).trim()
    return (
      <div>
        {before && <div className="chat-prose text-sm mb-2"><ReactMarkdown remarkPlugins={[remarkGfm]}>{before}</ReactMarkdown></div>}
        <div className="mt-2 rounded-xl border border-[rgba(170,255,0,0.20)] bg-[rgba(170,255,0,0.03)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-xs text-accent font-medium">Building your One-Sheeter...</span>
          </div>
          <div className="chat-prose text-sm opacity-70"><ReactMarkdown remarkPlugins={[remarkGfm]}>{partial}</ReactMarkdown></div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-prose text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
    </div>
  )
}

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

const STARTER_PROMPTS = [
  "Craft USP",
  "Build Unique Mechanism",
  "Build One-Sheet",
  "Skip to GTM Plan",
  "Help me price my offer without undercharging",
  "I'm stuck — help me identify what's really holding me back",
]

const MENTORS = [
  { id: 'standard', name: 'Ultimate', icon: Sparkles, color: 'bg-accent', description: 'Hormozi · Robbins · Wilde · Cardone · Brunson · Voss · Godin + more — all in one' },
  { id: 'hormozi', name: 'Offers', icon: Users, color: 'from-blue-600 to-blue-400', description: 'Alex Hormozi — $100M Offers deep-dive' },
  { id: 'robbins', name: 'Mindset', icon: Users, color: 'from-red-600 to-red-400', description: 'Tony Robbins — Psychology & breakthroughs' },
  { id: 'wilde', name: 'Sales', icon: Users, color: 'from-purple-600 to-purple-400', description: 'Eli Wilde — Sales language & NLP' },
]

export default function CoachPage() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/sign-in'
  }

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [activeMentorId, setActiveMentorId] = useState('standard')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleUpgrade() {
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (activeConversationId) loadMessages(activeConversationId)
  }, [activeConversationId])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
    }
  }, [input])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('upgraded') === 'true') {
        toast.success('Welcome to Premium! Unlimited coaching unlocked.')
        window.history.replaceState({}, '', '/coach')
      }
    }
  }, [])

  async function loadConversations() {
    const res = await fetch('/api/conversations')
    if (res.ok) {
      const data = await res.json()
      setConversations(data)
    }
  }

  async function loadMessages(convId: string) {
    setIsLoadingMessages(true)
    const res = await fetch(`/api/conversations/${convId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.map((m: Message) => ({ role: m.role, content: m.content })))
    }
    setIsLoadingMessages(false)
  }

  async function createConversation(firstMessage?: string) {
    const title = firstMessage
      ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '...' : '')
      : 'New Conversation'
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      const conv = await res.json()
      setConversations(prev => [conv, ...prev])
      setActiveConversationId(conv.id)
      return conv.id
    }
    return null
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConversationId === id) {
      setActiveConversationId(null)
      setMessages([])
    }
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return

    const userMessage: Message = { role: 'user', content }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsStreaming(true)

    let convId = activeConversationId
    if (!convId) {
      convId = await createConversation(content)
    }

    // Add streaming assistant message
    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId: convId,
          mentor: activeMentorId,
        }),
      })

      if (res.status === 429) {
        toast.error('Daily limit reached — upgrade to unlock unlimited coaching.')
        setMessages(prev => prev.slice(0, -1))
        setIsStreaming(false)
        handleUpgrade()
        return
      }

      if (res.status === 401) {
        window.location.href = '/sign-in'
        return
      }

      if (!res.ok) {
        toast.error('Something went wrong. Please try again.')
        setMessages(prev => prev.slice(0, -1))
        setIsStreaming(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullContent += chunk
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: fullContent },
        ])
      }
    } catch {
      toast.error('Connection error. Please try again.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const showStarters = messages.length === 0 && !isLoadingMessages

  return (
    <div className="flex h-screen bg-[#08080B] text-white overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 flex flex-col border-r border-[#1F1F28] bg-[#0F0F14] overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="p-4 flex items-center justify-between border-b border-[#1F1F28]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-black font-bold text-xs">B</span>
                </div>
                <span className="text-sm font-semibold truncate">Clarity Coach</span>
              </div>
              <button
                onClick={() => {
                  setActiveConversationId(null)
                  setMessages([])
                }}
                className="p-1.5 rounded-lg hover:bg-white/8 text-neutral-400 hover:text-white transition-colors"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-8 px-4">
                  Your conversations will appear here
                </p>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors border-l-2 ${
                      activeConversationId === conv.id
                        ? 'bg-[rgba(170,255,0,0.06)] text-white border-[#AAFF00]'
                        : 'text-[#7A7A8C] hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                    onClick={() => setActiveConversationId(conv.id)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar footer */}
            <div className="p-3 border-t border-[#1F1F28] space-y-1">
              <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors text-xs">
                <Settings className="w-3.5 h-3.5" />
                Business Profile
              </Link>
              <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors text-xs">
                <BarChart2 className="w-3.5 h-3.5" />
                Admin Dashboard
              </Link>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#7A7A8C] hover:bg-white/5 hover:text-[#EFEFEF] transition-colors">
                <div className="w-5 h-5 rounded-full bg-[rgba(170,255,0,0.20)] flex items-center justify-center">
                  <UserIcon className="w-3 h-3 text-accent" />
                </div>
                <span className="text-xs truncate flex-1">{user?.user_metadata?.full_name || user?.email}</span>
                <button onClick={handleSignOut} title="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 flex items-center px-4 border-b border-[#1F1F28] gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/8 text-neutral-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <span className="text-sm font-medium text-neutral-300">
            {activeConversationId
              ? conversations.find(c => c.id === activeConversationId)?.title || 'Conversation'
              : 'New Conversation'
            }
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            {MENTORS.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMentorId(m.id)}
                title={m.description}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeMentorId === m.id
                    ? m.id === 'standard'
                      ? 'bg-accent text-black shadow-sm'
                      : 'bg-white/10 text-white shadow-sm'
                    : m.id === 'standard'
                      ? 'text-accent/70 hover:text-accent'
                      : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <m.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{m.name}</span>
              </button>
            ))}
          </div>
          <div className="hidden sm:block text-xs text-neutral-600 ml-1">
            {MENTORS.find(m => m.id === activeMentorId)?.description}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {showStarters ? (
            <div className="h-full flex flex-col items-center justify-center px-6 py-12">
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-6 shadow-[0_0_48px_rgba(170,255,0,0.15)]">
                <Sparkles className="w-7 h-7 text-black" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-center">Your Ultimate Business Clarity Coach</h2>
              <p className="text-neutral-300 text-sm mb-3 text-center max-w-lg leading-relaxed">
                One advisor. Every framework. Hormozi&apos;s offer precision. Robbins&apos; psychology. Wilde&apos;s certainty. Cardone&apos;s 10X intensity. Brunson&apos;s funnel vision. Voss&apos;s negotiation mastery. Godin&apos;s differentiation instinct.
              </p>
              <p className="text-neutral-500 text-xs mb-8 text-center max-w-md">
                Pick a quick-start or tell me your biggest challenge this week.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left p-4 rounded-xl border border-[#1F1F28] bg-[#0F0F14] hover:bg-[#16161E] hover:border-[rgba(170,255,0,0.30)] transition-all text-sm text-[#7A7A8C] hover:text-[#EFEFEF]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-accent typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`message-enter flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-black" />
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-white/10 rounded-2xl rounded-tr-sm px-4 py-3' : ''}`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      ) : (
                        <div>
                          {isStreaming && i === messages.length - 1 && msg.content === '' ? (
                            <div className="flex gap-1.5 py-2">
                              {[0, 1, 2].map(j => (
                                <div key={j} className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" style={{ animationDelay: `${j * 0.2}s` }} />
                              ))}
                            </div>
                          ) : (
                            <MessageContent
                              content={msg.content || ''}
                              isStreaming={isStreaming && i === messages.length - 1}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4 text-neutral-300" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-[#0F0F14] border border-[#1F1F28] rounded-2xl px-4 py-3 focus-within:border-[rgba(170,255,0,0.40)] transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your business question..."
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-white placeholder-neutral-500 min-h-[24px] max-h-[160px] leading-relaxed disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                className="w-8 h-8 rounded-xl bg-accent hover:opacity-90 flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 text-center mt-2">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
