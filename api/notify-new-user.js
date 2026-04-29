// Sends an email to the admin when a new user signs up
// Requires RESEND_API_KEY in Vercel env vars
// Sign up free at resend.com → get API key → add to Vercel

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, userId, signedUpAt } = req.body || {}
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL || 'tpinhasi@outlook.com'

  if (!apiKey) {
    // Silently succeed — don't break the app if key isn't set up yet
    return res.status(200).json({ ok: true, skipped: true })
  }

  try {
    const when = signedUpAt ? new Date(signedUpAt).toLocaleString('en-AU', { timeZone: 'Australia/Adelaide' }) : 'just now'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'The Edge <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `🎉 New user signed up: ${email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; padding: 24px; background: #f9f9f9; border-radius: 12px;">
            <div style="font-size: 22px; font-weight: 700; color: #0F6E56; margin-bottom: 4px;">New sign-up on The Edge</div>
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Someone just joined your platform</div>
            <div style="background: white; border-radius: 10px; padding: 16px 20px; border: 1px solid #e5e5e5;">
              <div style="font-size: 13px; color: #9ca3af; margin-bottom: 4px;">Email</div>
              <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">${email}</div>
              <div style="font-size: 13px; color: #9ca3af; margin-bottom: 4px;">Signed up</div>
              <div style="font-size: 14px; color: #374151;">${when} (Adelaide time)</div>
            </div>
            <div style="margin-top: 20px;">
              <a href="https://the-edge-b2b.vercel.app" style="background: #0F6E56; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">Open Admin Dashboard →</a>
            </div>
            <div style="margin-top: 16px; font-size: 11px; color: #9ca3af;">The Edge — B2B Sales Intelligence</div>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Resend error:', err)
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Notify error:', e)
    return res.status(200).json({ ok: true }) // never break the app
  }
}
