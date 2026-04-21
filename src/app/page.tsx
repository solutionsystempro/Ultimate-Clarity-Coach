'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Star, CheckCircle2 } from 'lucide-react'

// ─── Scroll reveal hook ───────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

// ─── Data ────────────────────────────────────────────────────

const coaches = [
  { name: 'Alex Hormozi', lens: 'OFFER MATH', color: 'rgba(170,255,0,0.08)', border: 'rgba(170,255,0,0.20)', tag: '#AAFF00' },
  { name: 'Tony Robbins', lens: 'PSYCHOLOGY', color: 'rgba(255,140,0,0.07)', border: 'rgba(255,140,0,0.18)', tag: '#FF8C00' },
  { name: 'Eli Wilde', lens: 'CERTAINTY', color: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.18)', tag: '#8B5CF6' },
  { name: 'Grant Cardone', lens: '10X URGENCY', color: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.18)', tag: '#EF4444' },
  { name: 'Russell Brunson', lens: 'FUNNELS', color: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.18)', tag: '#3B82F6' },
  { name: 'Chris Voss', lens: 'NEGOTIATION', color: 'rgba(20,184,166,0.07)', border: 'rgba(20,184,166,0.18)', tag: '#14B8A6' },
  { name: 'Dan Kennedy', lens: 'PRECISION MKT', color: 'rgba(234,179,8,0.07)', border: 'rgba(234,179,8,0.18)', tag: '#EAB308' },
  { name: 'Seth Godin', lens: 'BRAND', color: 'rgba(236,72,153,0.07)', border: 'rgba(236,72,153,0.18)', tag: '#EC4899' },
  { name: 'Simon Sinek', lens: 'PURPOSE', color: 'rgba(99,102,241,0.07)', border: 'rgba(99,102,241,0.18)', tag: '#6366F1' },
  { name: 'April Dunford', lens: 'POSITIONING', color: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.18)', tag: '#F59E0B' },
  { name: 'Jay Abraham', lens: 'LEVERAGE', color: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.18)', tag: '#10B981' },
  { name: 'Brendon Burchard', lens: 'HIGH PERF', color: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.18)', tag: '#F97316' },
]

const steps = [
  { n: '01', title: 'Describe your biggest challenge', body: 'Type your question or pick a quick-start. The coach instantly detects whether it\'s an offer, mindset, sales, or funnel issue.' },
  { n: '02', title: 'Get a framework-driven answer', body: 'The right lens activates automatically. Hormozi for offers. Voss for objections. Robbins for mindset. You get the exact thinking each coach would apply.' },
  { n: '03', title: 'Walk away with a clear action', body: 'Every response ends with something you can execute today — a USP, a one-sheeter, a GTM plan, or a single decision that unblocks you.' },
]

const testimonials = [
  { quote: "This is like having a $30k coach on demand. The clarity I got in the first session would have taken months of trial and error.", author: "Sarah K.", role: "Agency Owner" },
  { quote: "I finally understand my offer and who I'm selling to. Revenue is up 40% in 6 weeks.", author: "Marcus T.", role: "Consultant" },
  { quote: "The frameworks in here are the same ones top coaches charge thousands for. This is insane value.", author: "Priya M.", role: "SaaS Founder" },
]

const freeFeatures = ['5 coaching sessions/day', 'Full knowledge base access', 'Business profile setup', 'USP, Mechanism & One-Sheet builder']
const premiumFeatures = ['Unlimited coaching sessions', 'All 4 coach modes', 'Deep business personalization', 'Advanced frameworks & sales systems', 'Full conversation history', 'Priority support']

// ─── Component ───────────────────────────────────────────────

export default function LandingPage() {
  useReveal()

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-inter)', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, borderBottom: '1px solid var(--border)', background: 'rgba(8,8,11,.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 13 }}>B</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-.02em' }}>Business Clarity Coach</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/sign-in" style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600, textDecoration: 'none', padding: '8px 14px' }}>
              Sign in
            </Link>
            <Link href="/sign-up" className="btn-glow" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 18px', borderRadius: 8, textDecoration: 'none', display: 'inline-block' }}>
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 24px 80px', textAlign: 'center' }}>
        {/* Radial glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center top, rgba(170,255,0,0.13) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative' }}>

          {/* Live badge */}
          <div className="reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 100, border: '1px solid rgba(170,255,0,0.25)', background: 'rgba(170,255,0,0.10)' }}>
              <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'block', flexShrink: 0 }} />
              <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>Now Live — $30,000 of Coaching, on Demand</span>
            </div>
          </div>

          {/* H1 */}
          <h1 className="reveal reveal-delay-1" style={{ fontSize: 'clamp(38px, 6.5vw, 72px)', fontWeight: 900, letterSpacing: '-.035em', lineHeight: 1.03, margin: '0 0 24px' }}>
            Every great coach.<br />
            <span className="gradient-text">One conversation.</span>
          </h1>

          {/* Subtitle */}
          <p className="reveal reveal-delay-2" style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: 'var(--muted)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Hormozi&apos;s offer precision. Robbins&apos; psychology. Wilde&apos;s certainty. Cardone&apos;s 10X energy. 12 world-class frameworks — one elite advisor that knows your business and drives you to your next breakthrough.
          </p>

          {/* Proof bar */}
          <div className="reveal reveal-delay-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40, flexWrap: 'wrap' }}>
            {[
              { n: '12', label: 'Expert Frameworks' },
              { n: '$30k', label: 'Coaching Value' },
              { n: '$97', label: '/mo Premium' },
            ].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <span style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 20px', display: 'block', flexShrink: 0 }} />}
                <div style={{ textAlign: 'center', padding: '0 8px' }}>
                  <div style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 900, letterSpacing: '-.02em', color: 'var(--text)' }}>{s.n}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="reveal reveal-delay-3" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/sign-up" className="btn-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#000', fontWeight: 800, fontSize: 16, padding: '16px 36px', borderRadius: 10, textDecoration: 'none', letterSpacing: '-.01em' }}>
              Create My Free Account
              <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/sign-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--muted)', fontWeight: 600, fontSize: 16, padding: '16px 32px', borderRadius: 10, textDecoration: 'none', border: '1px solid var(--border)', transition: 'border-color .2s, color .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted)' }}
            >
              Sign in
            </Link>
          </div>

          <p className="reveal reveal-delay-4" style={{ marginTop: 16, fontSize: 12, color: 'rgba(122,122,140,0.6)' }}>
            Create a free account so your coach remembers your business, your goals, and every conversation — and gets sharper every session.
          </p>
        </div>
      </section>

      {/* ── COACH ROSTER ── */}
      <section style={{ padding: '72px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 100, border: '1px solid rgba(170,255,0,0.25)', background: 'rgba(170,255,0,0.08)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20 }}>
              The Knowledge Base
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 14px' }}>
              12 world-class coaches.<br /><span className="gradient-text">One advisor.</span>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              The AI doesn&apos;t reference frameworks. It thinks with them. Each lens activates automatically based on what you actually need.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {coaches.map((c, i) => (
              <div key={c.name} className={`reveal reveal-delay-${Math.min((i % 4) + 1, 4) as 1 | 2 | 3 | 4}`}
                style={{ padding: '16px 18px', borderRadius: 12, background: c.color, border: `1px solid ${c.border}`, transition: 'transform .2s, box-shadow .2s', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${c.border}` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: c.tag, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{c.lens}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '72px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 100, border: '1px solid rgba(170,255,0,0.25)', background: 'rgba(170,255,0,0.08)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20 }}>
              How It Works
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, letterSpacing: '-.03em', margin: 0 }}>
              Clarity in three steps.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {steps.map((s, i) => (
              <div key={s.n} className={`reveal reveal-delay-${(i + 1) as 1 | 2 | 3}`}
                style={{ padding: '28px 24px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 48, fontWeight: 900, color: 'rgba(255,255,255,0.03)', lineHeight: 1, userSelect: 'none' }}>{s.n}</div>
                <div style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: 10, background: 'rgba(170,255,0,0.12)', border: '1px solid rgba(170,255,0,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 900 }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: '72px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 100, border: '1px solid rgba(170,255,0,0.25)', background: 'rgba(170,255,0,0.08)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20 }}>
              Pricing
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 12px' }}>
              Start free. Scale when ready.
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 16, margin: 0 }}>No contracts. Cancel anytime.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>

            {/* Free */}
            <div className="reveal" style={{ padding: '32px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Starter</h3>
                <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 6px' }}>Free</div>
                <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Get a taste of elite coaching</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {freeFeatures.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text)' }}>
                    <CheckCircle2 style={{ width: 15, height: 15, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 14, textDecoration: 'none', transition: 'border-color .2s, background .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(170,255,0,0.4)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(170,255,0,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
              >
                Get started free
              </Link>
            </div>

            {/* Premium */}
            <div className="reveal reveal-delay-1" style={{ padding: '32px', borderRadius: 16, background: 'rgba(170,255,0,0.04)', border: '1px solid rgba(170,255,0,0.28)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--accent)', color: '#000', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', padding: '5px 14px', borderRadius: '0 16px 0 8px' }}>MOST POPULAR</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'radial-gradient(ellipse at bottom, rgba(170,255,0,0.06), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Premium</h3>
                <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 2px' }}>
                  $97<span style={{ fontSize: 18, fontWeight: 500, color: 'var(--muted)' }}>/mo</span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Your $30k coach, on demand</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
                {premiumFeatures.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text)' }}>
                    <CheckCircle2 style={{ width: 15, height: 15, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up?plan=premium" className="btn-glow" style={{ display: 'block', textAlign: 'center', padding: '16px', borderRadius: 10, background: 'var(--accent)', color: '#000', fontWeight: 800, fontSize: 16, textDecoration: 'none', letterSpacing: '-.01em', position: 'relative' }}>
                Start Premium
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '72px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 12px' }}>What people are saying</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {testimonials.map((t, i) => (
              <div key={t.author} className={`reveal reveal-delay-${(i + 1) as 1 | 2 | 3}`}
                style={{ padding: '24px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} style={{ width: 14, height: 14, fill: '#EAB308', color: '#EAB308' }} />)}
                </div>
                <p style={{ fontSize: 14, color: 'rgba(239,239,239,0.85)', lineHeight: 1.7, margin: '0 0 16px' }}>&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.author}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '88px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, rgba(170,255,0,0.09), transparent 65%)', pointerEvents: 'none' }} />
        <div className="reveal" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.08, margin: '0 0 16px' }}>
            Ready to get clarity?
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 17, lineHeight: 1.6, margin: '0 0 12px' }}>
            Your coach remembers everything — your business, your goals, your breakthroughs. Every session builds on the last.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, margin: '0 0 36px' }}>
            Create your free account so the coach can personalize every answer to <em>your</em> specific situation — not generic advice.
          </p>
          <Link href="/sign-up" className="btn-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--accent)', color: '#000', fontWeight: 800, fontSize: 17, padding: '18px 44px', borderRadius: 12, textDecoration: 'none', letterSpacing: '-.01em' }}>
            Create My Free Account
            <ArrowRight style={{ width: 18, height: 18 }} />
          </Link>
          <p style={{ marginTop: 14, fontSize: 12, color: 'rgba(122,122,140,0.6)' }}>
            Free plan · 5 sessions/day · No credit card required
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 11 }}>B</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Business Clarity Coach</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>© 2026 Ultimate Business Clarity Coach. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms'].map(l => (
              <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted)'}
              >{l}</Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
