import type { ReactElement, FormEvent } from 'react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Bell, Send, Smartphone } from 'lucide-react'
import { sendBroadcast } from '../services/notifications'

type NotifType = 'announcement' | 'offer' | 'general'

const TYPE_LABELS: Record<NotifType, { label: string; color: string }> = {
  announcement: { label: 'Announcement', color: 'text-blue-400' },
  offer: { label: 'Special Offer', color: 'text-amber-400' },
  general: { label: 'General', color: 'text-slate-400' },
}

const Broadcasts = (): ReactElement => {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<NotifType>('general')
  const [lastResult, setLastResult] = useState<{ sent: number } | null>(null)

  const sendMutation = useMutation({
    mutationFn: () => sendBroadcast({ title, body, type }),
    onSuccess: (result) => {
      toast.success(`Notification sent to ${result.sent} users`)
      setLastResult(result)
      setTitle('')
      setBody('')
      setType('general')
    },
    onError: () => toast.error('Failed to send broadcast. Make sure the backend endpoint POST /admin/notifications/broadcast exists.'),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    const confirmed = window.confirm(`Send this notification to ALL users?\n\nTitle: ${title}\nMessage: ${body}`)
    if (confirmed) sendMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Broadcasts</h1>
        <p className="mt-1 text-sm text-slate-400">Send push notifications to all users.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
            <Bell size={15} className="text-indigo-400" /> Compose Notification
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Title <span className="text-slate-600">({title.length}/60)</span>
              </label>
              <input
                required
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Flash sale starts now!"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Message <span className="text-slate-600">({body.length}/200)</span>
              </label>
              <textarea
                required
                maxLength={200}
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Get 30% off sitewide for the next 24 hours only…"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotifType)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {(Object.keys(TYPE_LABELS) as NotifType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t].label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={sendMutation.isPending || !title.trim() || !body.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send size={15} />
              {sendMutation.isPending ? 'Sending…' : 'Send to All Users'}
            </button>
          </form>

          {lastResult && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              Last broadcast: sent to {lastResult.sent} users
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
            <Smartphone size={15} className="text-slate-400" /> Mobile Preview
          </h2>
          <div className="mx-auto max-w-[280px]">
            {/* Phone frame */}
            <div className="rounded-3xl border-4 border-slate-700 bg-slate-800 p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                <div className="h-1 flex-1 rounded-full bg-slate-700" />
                <div className="h-1.5 w-6 rounded-full bg-slate-600" />
              </div>
              {/* Notification card */}
              <div className="rounded-2xl bg-white/90 p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
                    <Bell size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {title || 'Notification title'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600 leading-tight line-clamp-3">
                      {body || 'Your message body appears here…'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold ${TYPE_LABELS[type].color}`}>
                    {TYPE_LABELS[type].label}
                  </span>
                  <span className="text-[10px] text-slate-400">just now</span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-xl bg-slate-700/50" />
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-600">Preview only — actual rendering varies by device</p>
        </div>
      </div>
    </div>
  )
}

export default Broadcasts
