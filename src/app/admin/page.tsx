'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, MessageSquare, BarChart2, ArrowLeft, RefreshCw,
  TrendingUp, ChevronDown, ChevronUp, Search,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalConversations: number
  totalMessages: number
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  user_id: string
  messages: { count: number }[]
}

interface UserMessage {
  id: string
  content: string
  role: string
  created_at: string
  conversation_id: string
}

interface Profile {
  user_id: string
  business_name: string
  industry: string
  stage: string
  monthly_revenue: number
  target_revenue: number
  biggest_challenge: string
  goals: string
  updated_at: string
}

interface User {
  id: string
  email: string
  full_name: string
  plan: string
  created_at: string
  messages_used_today: number
}

interface AdminData {
  stats: Stats
  recentConversations: Conversation[]
  recentMessages: UserMessage[]
  profiles: Profile[]
  users: User[]
}

type Tab = 'overview' | 'conversations' | 'questions' | 'users'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType, label: string, value: number, color: string
}) {
  return (
    <div className="bg-[#0F0F14] border border-[#1F1F28] rounded-2xl p-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-sm text-neutral-500">{label}</div>
    </div>
  )
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const secs = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set())

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin')
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied. Admin only.' : 'Failed to load data.')
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  function toggleProfile(userId: string) {
    setExpandedProfiles(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const filteredMessages = data?.recentMessages.filter(m =>
    m.content.toLowerCase().includes(search.toLowerCase())
  ) || []

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'questions', label: 'Questions Asked', icon: Search },
    { id: 'users', label: 'Users', icon: Users },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080B] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#08080B] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">{error}</div>
          <Link href="/coach" className="text-sm text-neutral-500 hover:text-white transition-colors">← Back to Coach</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/coach" className="p-2 rounded-xl hover:bg-white/5 text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <p className="text-xs text-neutral-500">Ultimate Business Clarity Coach</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-neutral-400 hover:text-white transition-all border border-white/5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab navigation */}
        <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5 w-fit mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && data && (
          <div className="space-y-8">
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard icon={Users} label="Total Users" value={data.stats.totalUsers} color="bg-blue-600/30" />
              <StatCard icon={MessageSquare} label="Total Conversations" value={data.stats.totalConversations} color="bg-accent/30" />
              <StatCard icon={TrendingUp} label="Total Messages" value={data.stats.totalMessages} color="bg-purple-600/30" />
            </div>

            {/* Business Profiles Summary */}
            {data.profiles.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-4">Business Profiles ({data.profiles.length})</h2>
                <div className="space-y-3">
                  {data.profiles.map(profile => (
                    <div key={profile.user_id} className="bg-[#0F0F14] border border-[#1F1F28] rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleProfile(profile.user_id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {profile.business_name || 'Unnamed Business'}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {profile.industry || 'No industry'} · {profile.stage || 'No stage'}
                              {profile.monthly_revenue ? ` · $${profile.monthly_revenue.toLocaleString()}/mo` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-neutral-600">{timeAgo(profile.updated_at)}</span>
                          {expandedProfiles.has(profile.user_id)
                            ? <ChevronUp className="w-4 h-4 text-neutral-500" />
                            : <ChevronDown className="w-4 h-4 text-neutral-500" />
                          }
                        </div>
                      </button>
                      {expandedProfiles.has(profile.user_id) && (
                        <div className="px-4 pb-4 border-t border-[#1F1F28] pt-3 grid sm:grid-cols-2 gap-3">
                          {profile.biggest_challenge && (
                            <div>
                              <div className="text-xs text-neutral-500 mb-1">Biggest Challenge</div>
                              <div className="text-sm text-neutral-300">{profile.biggest_challenge}</div>
                            </div>
                          )}
                          {profile.goals && (
                            <div>
                              <div className="text-xs text-neutral-500 mb-1">Goals</div>
                              <div className="text-sm text-neutral-300">{profile.goals}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONVERSATIONS */}
        {activeTab === 'conversations' && data && (
          <div>
            <h2 className="text-base font-semibold mb-4">Recent Conversations ({data.recentConversations.length})</h2>
            <div className="space-y-2">
              {data.recentConversations.map(conv => (
                <div key={conv.id} className="bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 flex items-center justify-between hover:border-white/10 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-white">{conv.title}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      User: {conv.user_id.slice(0, 12)}... · {conv.messages?.[0]?.count || 0} messages
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 flex-shrink-0 ml-4">{timeAgo(conv.updated_at)}</div>
                </div>
              ))}
              {data.recentConversations.length === 0 && (
                <div className="text-sm text-neutral-500 text-center py-12">No conversations yet</div>
              )}
            </div>
          </div>
        )}

        {/* QUESTIONS ASKED */}
        {activeTab === 'questions' && data && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold">Questions Asked ({data.recentMessages.length})</h2>
              <div className="flex-1 max-w-sm">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-accent/40 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              {filteredMessages.map(msg => (
                <div key={msg.id} className="bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3">
                  <div className="text-sm text-neutral-200 leading-relaxed">{msg.content}</div>
                  <div className="text-xs text-neutral-600 mt-1.5">{timeAgo(msg.created_at)}</div>
                </div>
              ))}
              {filteredMessages.length === 0 && (
                <div className="text-sm text-neutral-500 text-center py-12">
                  {search ? 'No matching questions found' : 'No questions yet'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && data && (
          <div>
            <h2 className="text-base font-semibold mb-4">Users ({data.users.length})</h2>
            <div className="space-y-2">
              {data.users.map(user => (
                <div key={user.id} className="bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{user.full_name || user.email || 'Anonymous'}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {user.email} · {user.messages_used_today || 0} messages today
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      user.plan === 'premium'
                        ? 'bg-accent/15 text-accent border border-accent/20'
                        : 'bg-white/5 text-neutral-400 border border-white/10'
                    }`}>
                      {user.plan || 'free'}
                    </span>
                    <span className="text-xs text-neutral-600">{timeAgo(user.created_at)}</span>
                  </div>
                </div>
              ))}
              {data.users.length === 0 && (
                <div className="text-sm text-neutral-500 text-center py-12">No users yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
