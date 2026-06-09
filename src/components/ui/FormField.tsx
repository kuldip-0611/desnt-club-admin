import type { ReactElement, ReactNode } from 'react'

type FormFieldProps = {
  label: string
  htmlFor?: string
  error?: ReactNode
  hint?: ReactNode
  children: ReactNode
}

const FormField = ({
  label,
  htmlFor,
  error,
  hint,
  children,
}: FormFieldProps): ReactElement => {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

export default FormField
