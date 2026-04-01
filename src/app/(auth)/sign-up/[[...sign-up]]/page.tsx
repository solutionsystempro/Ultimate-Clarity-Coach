import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center top, rgba(0,200,83,0.10) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#00C853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 14 }}>B</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#EFEFEF', letterSpacing: '-.02em' }}>Business Clarity Coach</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', color: '#EFEFEF', margin: '0 0 8px' }}>Create your free account</h1>
          <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            Your coach will remember your business, your goals,<br />and every session — getting sharper every time.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-[#0F0F14] border border-[#1F1F28] shadow-2xl rounded-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-[#7A7A8C]',
              formButtonPrimary: 'bg-[#00C853] hover:opacity-90 text-black font-bold',
              formFieldInput: 'bg-[#08080B] border-[#1F1F28] text-white focus:border-[#00C853]',
              formFieldLabel: 'text-[#EFEFEF]',
              footerActionLink: 'text-[#00C853] hover:opacity-80',
              identityPreviewText: 'text-[#EFEFEF]',
              identityPreviewEditButton: 'text-[#00C853]',
              dividerLine: 'bg-[#1F1F28]',
              dividerText: 'text-[#7A7A8C]',
              socialButtonsBlockButton: 'bg-[#16161E] border-[#1F1F28] text-[#EFEFEF] hover:bg-[#1F1F28]',
              socialButtonsBlockButtonText: 'text-[#EFEFEF] font-medium',
            },
          }}
        />
        </div>
      </div>
    </div>
  )
}
