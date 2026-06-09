import type { ReactElement, ReactNode } from 'react'

type KpiTone = 'default' | 'success' | 'warning'

type KpiCardProps = {
  label: string
  value: ReactNode
  helper?: string
  tone?: KpiTone
}

const valueTone: Record<KpiTone, string> = {
  default: 'text-slate-900',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
}

const KpiCard = ({
  label,
  value,
  helper,
  tone = 'default',
}: KpiCardProps): ReactElement => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueTone[tone]}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  )
}

export default KpiCard
