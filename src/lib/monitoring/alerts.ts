import logger from '@/lib/logger'

export type AlertType = 'performance' | 'error' | 'security' | 'availability' | 'custom'
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface Alert {
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  metadata?: Record<string, unknown>
  route?: string
  userId?: string
  timestamp: number
}

async function sendSlackAlert(alert: Alert): Promise<boolean> {
  if (!process.env.SLACK_WEBHOOK_URL) return false

  const colors: Record<AlertSeverity, string> = { info: 'good', warning: 'warning', error: 'danger', critical: 'danger' }
  const emojis: Record<AlertType, string> = { performance: '⚡', error: '🚨', security: '🔒', availability: '🌐', custom: '📢' }

  try {
    const res = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emojis[alert.type]} ${alert.title}`,
        attachments: [{
          color: colors[alert.severity],
          fields: [
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Type', value: alert.type, short: true },
            { title: 'Message', value: alert.message, short: false },
            ...(alert.route ? [{ title: 'Route', value: alert.route, short: true }] : []),
            ...(alert.metadata ? [{ title: 'Details', value: JSON.stringify(alert.metadata, null, 2), short: false }] : []),
          ],
          footer: 'GYS Monitoring System',
          ts: Math.floor(alert.timestamp / 1000),
        }],
      }),
    })
    return res.ok
  } catch (err) {
    logger.error('Failed to send Slack alert:', err)
    return false
  }
}

async function sendEmailAlert(alert: Alert): Promise<boolean> {
  if (!process.env.ALERT_EMAIL_ENDPOINT) return false

  const bgColor = alert.severity === 'critical' ? '#dc2626' : alert.severity === 'error' ? '#ea580c' : alert.severity === 'warning' ? '#d97706' : '#059669'
  try {
    const res = await fetch(process.env.ALERT_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || ['admin@gys.com'],
        subject: `[GYS Alert] ${alert.severity.toUpperCase()}: ${alert.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px">
          <div style="background:${bgColor};color:white;padding:20px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:24px">${alert.title}</h1>
            <p style="margin:10px 0 0;opacity:.9">Severity: ${alert.severity.toUpperCase()} | Type: ${alert.type}</p>
          </div>
          <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none">
            <p style="color:#6b7280">${alert.message}</p>
            ${alert.route ? `<code style="background:#e5e7eb;padding:4px 8px;border-radius:4px">${alert.route}</code>` : ''}
            ${alert.metadata ? `<pre style="background:#1f2937;color:#f9fafb;padding:16px;border-radius:8px;font-size:14px">${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
            <p style="color:#9ca3af;font-size:14px;margin-top:20px">${new Date(alert.timestamp).toLocaleString()}</p>
          </div>
        </div>`,
        alert,
      }),
    })
    return res.ok
  } catch (err) {
    logger.error('Failed to send email alert:', err)
    return false
  }
}

async function sendWebhookAlert(alert: Alert): Promise<boolean> {
  if (!process.env.CUSTOM_WEBHOOK_URL) return false

  try {
    const res = await fetch(process.env.CUSTOM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GYS-Signature': process.env.WEBHOOK_SECRET || 'gys-secret',
      },
      body: JSON.stringify({ event: 'gys_alert', alert, timestamp: Date.now(), source: 'gys-monitoring' }),
    })
    return res.ok
  } catch (err) {
    logger.error('Failed to send webhook alert:', err)
    return false
  }
}

export async function processAlerts(alerts: Alert[]) {
  const results = { processed: alerts.length, sent: { slack: 0, email: 0, webhook: 0 }, failed: { slack: 0, email: 0, webhook: 0 } }
  const hasSlack = !!process.env.SLACK_WEBHOOK_URL
  const hasEmail = !!process.env.ALERT_EMAIL_ENDPOINT
  const hasWebhook = !!process.env.CUSTOM_WEBHOOK_URL

  for (const alert of alerts) {
    const promises: Promise<void>[] = []

    if (hasSlack && ['warning', 'error', 'critical'].includes(alert.severity)) {
      promises.push(sendSlackAlert(alert).then(ok => { if (ok) results.sent.slack++; else results.failed.slack++ }))
    }
    if (hasEmail && ['error', 'critical'].includes(alert.severity)) {
      promises.push(sendEmailAlert(alert).then(ok => { if (ok) results.sent.email++; else results.failed.email++ }))
    }
    if (hasWebhook) {
      promises.push(sendWebhookAlert(alert).then(ok => { if (ok) results.sent.webhook++; else results.failed.webhook++ }))
    }

    await Promise.allSettled(promises)
    logger.info(`Alert processed: ${alert.type}/${alert.severity} - ${alert.title}`)
  }

  return results
}
