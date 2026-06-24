import type { ReactElement } from 'react'
import { AlertTriangle, Bell, Send } from 'lucide-react'

type ConfirmBroadcastModalProps = {
  isOpen: boolean
  title: string
  body: string
  typeLabel: string
  isLoading?: boolean
  onConfirm: () => void
  onClose: () => void
}

const ConfirmBroadcastModal = ({
  isOpen,
  title,
  body,
  typeLabel,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmBroadcastModalProps): ReactElement | null => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm broadcast"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10">
          <AlertTriangle size={22} className="text-indigo-400" />
        </div>
        <h2 className="mb-1 text-base font-semibold text-white">Send to all users?</h2>
        <p className="mb-5 text-sm text-slate-400">
          This push notification will be delivered to every registered device. This action cannot be undone.
        </p>

        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Bell size={13} className="text-indigo-400" />
            Preview
          </div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
          <p className="mt-3 text-xs font-medium text-indigo-300">{typeLabel}</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            <Send size={14} />
            {isLoading ? 'Sending…' : 'Send broadcast'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmBroadcastModal
