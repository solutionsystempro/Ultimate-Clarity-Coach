'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage({ searchParams }: { searchParams: { tab?: string; error?: string } }) {
  const [tab, setTab] = useState<'signup' | 'signin'>(
    searchParams?.tab === 'signin' ? 'signin' : 'signup'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(searchParams?.error === 'oauth_failed' ? 'OAuth sign-in failed. Please try again.' : '')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleGoogle() {
    setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleEmailAuth() {
    setError('')
    setLoading(true)
    if (tab === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setError('Check your email to confirm your account, then sign in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        window.location.href = '/coach'
      }
    }
    setLoading(false)
  }

  const heading = tab === 'signup' ? 'Create your free account' : 'Welcome back'
  const subheading = tab === 'signup'
    ? 'Your coach will remember your business, your goals, and every session.'
    : 'Your coach remembers everything. Pick up right where you left off.'

  return (
    <div style={{ minHeight: '100vh', background: '#08080B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center top, rgba(0,200,83,0.10) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#00C853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 14 }}>B</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#EFEFEF', letterSpacing: '-.02em' }}>Business Clarity Coach</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', color: '#EFEFEF', margin: '0 0 8px' }}>{heading}</h1>
          <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{subheading}</p>
        </div>

        {/* Card */}
        <div style={{ background: '#0F0F14', border: '1px solid #1F1F28', borderRadius: 20, padding: '28px 28px 24px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: 24, border: '1px solid #1F1F28', borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => { setTab('signup'); setError('') }}
              style={{ flex: 1, padding: '11px', background: tab === 'signup' ? '#00C853' : 'transparent', border: 'none', color: tab === 'signup' ? '#000' : '#7A7A8C', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
            >
              Create Account
            </button>
            <button
              onClick={() => { setTab('signin'); setError('') }}
              style={{ flex: 1, padding: '11px', background: tab === 'signin' ? '#00C853' : 'transparent', border: 'none', color: tab === 'signin' ? '#000' : '#7A7A8C', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
            >
              Sign In
            </button>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', background: '#16161E', border: '1px solid #1F1F28', borderRadius: 10, color: '#EFEFEF', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, transition: 'border-color .15s' }}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(0,200,83,0.4)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = '#1F1F28')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: '#7A7A8C', fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: '#1F1F28' }} />
            or
            <div style={{ flex: 1, height: 1, background: '#1F1F28' }} />
          </div>

          {/* Email + Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              style={{ width: '100%', padding: '12px 14px', background: '#08080B', border: '1px solid #1F1F28', borderRadius: 10, color: '#EFEFEF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(0,200,83,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#1F1F28')}
            />
            <input
              type="password"
              placeholder={tab === 'signup' ? 'Password (min 6 characters)' : 'Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
              style={{ width: '100%', padding: '12px 14px', background: '#08080B', border: '1px solid #1F1F28', borderRadius: 10, color: '#EFEFEF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(0,200,83,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#1F1F28')}
            />

            {error && (
              <p style={{ fontSize: 13, color: error.includes('Check your email') ? '#00C853' : '#FF3B30', margin: 0 }}>{error}</p>
            )}

            <button
              onClick={handleEmailAuth}
              disabled={loading}
              style={{ width: '100%', padding: '13px', background: '#00C853', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity .15s' }}
            >
              {loading ? 'Please wait...' : tab === 'signup' ? 'Create Account →' : 'Sign In →'}
            </button>
          </div>

          <p style={{ fontSize: 12, color: '#7A7A8C', marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
            No spam. Your data stays private.
          </p>
        </div>
      </div>
    </div>
  )
}
