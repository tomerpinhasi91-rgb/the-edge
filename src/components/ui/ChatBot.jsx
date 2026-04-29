import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../lib/context'
import { callAI } from '../../lib/ai'
import { loadProfile, buildRepContext } from '../../lib/helpers'
import { loadICP, buildICPContext } from '../../lib/icp'
import Spinner from './Spinner'

const STARTERS = [
  'How do I find new prospects?',
  'What's the difference between a lead and a deal?',
  'How does the AI coach work?',
  'How do I log a sales activity?',
  'What are intelligence signals?',
  'How do I set up my ICP?',
]

const APP_GUIDE = `You are the Edge Assistant — a helpful, friendly guide for The Edge, a B2B sales intelligence platform for field sales reps.

THE EDGE — FEATURE OVERVIEW:
• Lead Room: Find new prospects using AI-powered search. Research any company (signals, talking points). Save promising companies as leads. Use Email Finder (Hunter.io) to find contact emails.
• Leads: Saved prospect companies. Each lead has: Overview (score, company info, signals), Intel (AI news sweep with quick buttons), Activities (log calls/meetings/emails/demos, AI coach generates outreach emails, call scripts, next best actions, meeting agendas), Contacts (add key stakeholders with role types: Champion, Economic Buyer, Influencer, Blocker, Technical Buyer, User), Notes, AI Coach (full coaching session). Leads can be converted to Deals when ready.
• Deals (Accounts): Active pipeline opportunities. Same tabs as Leads plus: Dashboard with deal metrics (stage, value, risk, urgency), win strategy, checklist, and pipeline stages (Qualify → Proposal → Negotiate → Closing → Won/Lost).
• Profile: Set your rep details (name, company, what you sell, deal size, territory) and your ICP (Ideal Customer Profile — target industries, company sizes, personas, value props, messaging). This context is automatically injected into every AI response across the app.
• AI Coach: Available in every lead and deal. Generates context-aware coaching based on your profile, ICP, and deal/lead data.
• Market Intel: Available in Intel tabs — industry trend research with 24h cache.
• Intelligence Sweep: Quick AI research on any company using web search → returns prioritised signals (urgent/watch/intel/grant).

PHOTO / BRAND ANALYSIS MODE:
When a user uploads a photo of a product, brand, packaging, shelf, storefront, or business:
1. Identify all visible brands and products in the image
2. For each key brand: name the manufacturer/supplier, estimate company size, state their industry
3. Give a sharp B2B sales angle — why would this company need what the rep sells?
4. Suggest the right decision-maker title to target (e.g. "Head of Procurement", "National Sales Manager")
5. Note any signals: new product lines, premium positioning, distribution scale, growth indicators
6. End with: "Want me to save [Brand Name] as a lead?" — keep it action-oriented
Be brief and punchy — the rep is standing in a shop or venue. No waffle.

TIPS:
• Fill in your Profile and ICP first — every AI feature improves with that context.
• Use quick buttons in the Intel tab for instant sweeps.
• Log activities to build deal history — the AI coach uses your last 5 activities.
• Signal types: urgent (act now), watch (monitor), intel (useful context), grant (funding opportunity).

Be concise, practical and friendly. Answer app questions precisely. For general sales advice, be immediately actionable.`

// Compress + resize image to keep payloads small (phone photos can be 4MB+)
async function compressImage(file, maxPx = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = dataUrl.split(',')[1]
        resolve({ base64, dataUrl, mediaType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Strip internal display fields before sending to API
function toApiMessages(messages) {
  return messages.map(({ _imageUrl, ...m }) => m)
}

// Extract text and image from a message for display
function getDisplayParts(m) {
  if (typeof m.content === 'string') return { text: m.content, imageUrl: m._imageUrl || null }
  const text = m.content.find(b => b.type === 'text')?.text || ''
  const img = m.content.find(b => b.type === 'image')
  const imageUrl = m._imageUrl || (img ? `data:${img.source.media_type};base64,${img.source.data}` : null)
  return { text, imageUrl }
}

export default function ChatBot() {
  const { user } = useApp()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingImage, setPendingImage] = useState(null) // { base64, dataUrl, mediaType }
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open && messages.length === 0) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const buildSystemPrompt = () => {
    let system = APP_GUIDE
    const profile = loadProfile(user?.id)
    const { repName, repCtx } = buildRepContext(profile)
    if (repCtx) system += `\n\nREP CONTEXT: ${repCtx}`
    const icp = loadICP(user?.id)
    const icpCtx = buildICPContext(icp)
    if (icpCtx) system += `\n\nICP: ${icpCtx}`
    return system
  }

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const compressed = await compressImage(file)
      setPendingImage(compressed)
      inputRef.current?.focus()
    } catch (err) {
      console.error('Image compress failed', err)
    }
  }

  const send = async (textOverride) => {
    const text = (textOverride !== undefined ? textOverride : input).trim()
    if (!text && !pendingImage) return
    if (loading) return
    setInput('')

    // Build user message
    let userMessage
    if (pendingImage) {
      const displayText = text || 'Analyse this brand and give me sales intelligence on it.'
      userMessage = {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: pendingImage.mediaType, data: pendingImage.base64 } },
          { type: 'text', text: displayText }
        ],
        _imageUrl: pendingImage.dataUrl, // kept for rendering, stripped before API call
      }
      setPendingImage(null)
    } else {
      userMessage = { role: 'user', content: text }
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const system = buildSystemPrompt()
      const result = await callAI(system, toApiMessages(nextMessages), 700)
      setMessages(prev => [...prev, { role: 'assistant', content: result }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clear = () => { setMessages([]); setInput(''); setPendingImage(null) }
  const removePendingImage = () => setPendingImage(null)

  const canSend = (input.trim() || pendingImage) && !loading

  return (
    <>
      {/* ── Floating bubble ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#0a5a44' : '#0F6E56',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(15,110,86,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, transition: 'all 0.2s', color: 'white',
        }}
        title="Edge Assistant"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 999,
          width: 370, height: 540,
          background: 'white', borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', border: '0.5px solid #e5e5e5',
          animation: 'chatSlideUp 0.2s ease',
        }}>

          {/* Header */}
          <div style={{
            background: '#0F6E56', padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>⚡</div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Edge Assistant</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Ask anything · scan brands</div>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={clear} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 11, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Empty state — starters */}
            {messages.length === 0 && (
              <div>
                <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 14, marginTop: 4 }}>
                  Ask me anything about The Edge, or 📸 snap a brand for instant sales intel.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STARTERS.map((s, i) => (
                    <button key={i} onClick={() => send(s)} style={{
                      background: '#f3faf7', border: '0.5px solid #9FE1CB',
                      borderRadius: 20, padding: '6px 12px',
                      fontSize: 12, color: '#0F6E56', cursor: 'pointer',
                      fontWeight: 500, lineHeight: 1.4, textAlign: 'left',
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message thread */}
            {messages.map((m, i) => {
              const { text, imageUrl } = getDisplayParts(m)
              const isUser = m.role === 'user'
              return (
                <div key={i} style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                  {!isUser && (
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginBottom: 2 }}>⚡</div>
                  )}
                  <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    {/* Image thumbnail */}
                    {imageUrl && (
                      <div style={{
                        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        overflow: 'hidden', maxWidth: 200,
                        border: '0.5px solid #e5e5e5',
                      }}>
                        <img src={imageUrl} alt="uploaded" style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }} />
                      </div>
                    )}
                    {/* Text bubble */}
                    {text && (
                      <div style={{
                        padding: '9px 12px',
                        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: isUser ? '#0F6E56' : '#f4f4f5',
                        color: isUser ? 'white' : '#1f2937',
                        fontSize: 13, lineHeight: 1.55,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {text}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>⚡</div>
                <div style={{ background: '#f4f4f5', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Spinner />
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Thinking…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Image preview bar */}
          {pendingImage && (
            <div style={{ padding: '8px 12px 0', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={pendingImage.dataUrl} alt="preview" style={{ height: 72, width: 72, objectFit: 'cover', borderRadius: 10, border: '1.5px solid #9FE1CB', display: 'block' }} />
                <button onClick={removePendingImage} style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#374151', border: 'none', color: 'white',
                  fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}>✕</button>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Image ready · add a note or just send</div>
            </div>
          )}

          {/* Input area */}
          <div style={{ padding: '10px 12px 12px', borderTop: '0.5px solid #f3f3f3', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>

              {/* Camera / upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload or take a photo of a brand"
                style={{
                  width: 36, height: 36, borderRadius: 10, border: '1px solid #e5e5e5',
                  background: pendingImage ? '#f3faf7' : 'white',
                  color: pendingImage ? '#0F6E56' : '#9ca3af',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleImagePick}
              />

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={pendingImage ? 'Add a note, or just send…' : 'Ask anything…'}
                disabled={loading}
                rows={1}
                style={{
                  flex: 1, resize: 'none', border: '1px solid #e5e5e5',
                  borderRadius: 10, padding: '9px 12px',
                  fontSize: 13, fontFamily: 'inherit', lineHeight: 1.45,
                  outline: 'none', color: '#1f2937', background: 'white',
                  maxHeight: 100, overflowY: 'auto',
                }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
              />

              {/* Send button */}
              <button
                onClick={() => send()}
                disabled={!canSend}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none',
                  background: canSend ? '#0F6E56' : '#e5e5e5',
                  color: canSend ? 'white' : '#9ca3af',
                  cursor: canSend ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                ↑
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#d4d4d4', marginTop: 5, textAlign: 'center' }}>
              Enter to send · Shift+Enter for new line · 📷 snap a brand for instant intel
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
