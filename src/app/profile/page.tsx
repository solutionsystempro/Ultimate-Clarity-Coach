'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface Profile {
  business_name: string
  industry: string
  stage: string
  monthly_revenue: string
  target_revenue: string
  biggest_challenge: string
  target_customer: string
  current_offer: string
  goals: string
}

const stages = [
  { value: 'idea', label: 'Idea Stage — No revenue yet' },
  { value: 'pre-revenue', label: 'Pre-Revenue — Testing the market' },
  { value: 'early', label: 'Early Stage — Under $5k/month' },
  { value: 'growth', label: 'Growth — $5k–$50k/month' },
  { value: 'scaling', label: 'Scaling — $50k+/month' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<Profile>({
    business_name: '',
    industry: '',
    stage: '',
    monthly_revenue: '',
    target_revenue: '',
    biggest_challenge: '',
    target_customer: '',
    current_offer: '',
    goals: '',
  })

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setProfile({
            business_name: data.business_name || '',
            industry: data.industry || '',
            stage: data.stage || '',
            monthly_revenue: data.monthly_revenue?.toString() || '',
            target_revenue: data.target_revenue?.toString() || '',
            biggest_challenge: data.biggest_challenge || '',
            target_customer: data.target_customer || '',
            current_offer: data.current_offer || '',
            goals: data.goals || '',
          })
        }
      }
      setIsLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profile,
        monthly_revenue: profile.monthly_revenue ? parseFloat(profile.monthly_revenue) : null,
        target_revenue: profile.target_revenue ? parseFloat(profile.target_revenue) : null,
      }),
    })
    if (res.ok) {
      toast.success('Profile saved! Your coach now knows your business.')
      router.push('/coach')
    } else {
      toast.error('Failed to save. Please try again.')
    }
    setIsSaving(false)
  }

  function update(field: keyof Profile, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080B] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EFEFEF]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-10">
          <Link href="/coach" className="p-2 rounded-xl hover:bg-white/8 text-[#7A7A8C] hover:text-[#EFEFEF] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Business Profile</h1>
            <p className="text-sm text-[#7A7A8C] mt-1">The more context you give, the better the coaching</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Business Name">
              <input
                value={profile.business_name}
                onChange={e => update('business_name', e.target.value)}
                className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#7A7A8C] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors"
                placeholder="e.g. Apex Consulting"
              />
            </Field>
            <Field label="Industry">
              <input
                value={profile.industry}
                onChange={e => update('industry', e.target.value)}
                className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#7A7A8C] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors"
                placeholder="e.g. Marketing, SaaS, Real Estate..."
              />
            </Field>
          </div>

          <Field label="Business Stage">
            <select
              value={profile.stage}
              onChange={e => update('stage', e.target.value)}
              className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors"
            >
              <option value="" className="text-[#7A7A8C]">Select your stage...</option>
              {stages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Current Monthly Revenue ($)">
              <input
                type="number"
                value={profile.monthly_revenue}
                onChange={e => update('monthly_revenue', e.target.value)}
                className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#7A7A8C] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors"
                placeholder="e.g. 5000"
              />
            </Field>
            <Field label="Target Monthly Revenue ($)">
              <input
                type="number"
                value={profile.target_revenue}
                onChange={e => update('target_revenue', e.target.value)}
                className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#7A7A8C] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors"
                placeholder="e.g. 25000"
              />
            </Field>
          </div>

          <Field label="Your Current Offer" hint="What do you sell? Be specific.">
            <textarea
              value={profile.current_offer}
              onChange={e => update('current_offer', e.target.value)}
              rows={3}
              className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#7A7A8C] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors resize-none"
              placeholder="e.g. 90-day marketing coaching program for e-commerce brands doing $100k–$1M/year..."
            />
          </Field>

          <Field label="Target Customer" hint="Who specifically are you trying to serve?">
            <textarea
              value={profile.target_customer}
              onChange={e => update('target_customer', e.target.value)}
              rows={3}
              className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#7A7A8C] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors resize-none"
              placeholder="e.g. B2B SaaS founders with 5–50 employees who are struggling with outbound sales..."
            />
          </Field>

          <Field label="Biggest Challenge Right Now">
            <textarea
              value={profile.biggest_challenge}
              onChange={e => update('biggest_challenge', e.target.value)}
              rows={3}
              className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#7A7A8C] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors resize-none"
              placeholder="Be honest. What's the #1 thing blocking your growth right now?"
            />
          </Field>

          <Field label="Goals — What does success look like in 12 months?">
            <textarea
              value={profile.goals}
              onChange={e => update('goals', e.target.value)}
              rows={3}
              className="w-full bg-[#0F0F14] border border-[#1F1F28] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#7A7A8C] focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors resize-none"
              placeholder="e.g. $30k/month, 10 retainer clients, fully booked calendar, team of 3..."
            />
          </Field>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Profile & Start Coaching'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#7A7A8C] mb-1.5">{label}</label>
      {hint && <p className="text-xs text-[#7A7A8C]/60 mb-2">{hint}</p>}
      {children}
    </div>
  )
}
