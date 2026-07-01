import { apiErrorMessage } from '../services/api'
import type { ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Field, Form, Formik, ErrorMessage } from 'formik'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import FormField from '../components/ui/FormField'
import { createSize, getSize, listMeasurementAttributes, updateSize } from '../services/sizing'
import type { MeasurementAttribute } from '../types/sizing'

const baseSchema = Yup.object({
  code: Yup.string().trim().required('Code is required').max(32),
  name: Yup.string().trim().max(120),
  sortOrder: Yup.number().integer('Must be a whole number').min(0, 'Must be ≥ 0').required('Sort order is required'),
  valueUnit: Yup.string().oneOf(['', 'cm', 'in']),
  isActive: Yup.boolean().required(),
})

type FormValues = {
  code: string
  name: string
  sortOrder: number
  valueUnit: '' | 'cm' | 'in'
  isActive: boolean
}

const SizeForm = (): ReactElement => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isCreate = Boolean(useMatch('/dashboard/sizes/new'))

  const [measures, setMeasures] = useState<Record<string, string>>({})

  const { data: attrs = [], isLoading: attrsLoading } = useQuery({
    queryKey: ['admin-measurement-attributes'],
    queryFn: listMeasurementAttributes,
  })

  const activeAttrs = useMemo(
    () => [...attrs].filter((a) => a.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [attrs],
  )

  const { data: existing, isLoading: sizeLoading } = useQuery({
    queryKey: ['admin-size', id],
    queryFn: () => getSize(id!),
    enabled: !isCreate && Boolean(id),
  })

  useEffect(() => {
    if (!existing?.measurementValues) return
    const next: Record<string, string> = {}
    for (const mv of existing.measurementValues) {
      next[mv.attributeId] = mv.value
    }
    setMeasures(next)
  }, [existing])

  const createMutation = useMutation({
    mutationFn: createSize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sizes'] })
      toast.success('Size created')
      navigate('/dashboard/sizes')
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Save failed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ sid, payload }: { sid: string; payload: Parameters<typeof updateSize>[1] }) =>
      updateSize(sid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sizes'] })
      queryClient.invalidateQueries({ queryKey: ['admin-size', id] })
      toast.success('Size saved')
      navigate('/dashboard/sizes')
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Save failed')),
  })

  const buildMeasurements = (attrList: MeasurementAttribute[]) =>
    attrList
      .map((a) => ({
        attributeId: a.id,
        value: (measures[a.id] ?? '').trim(),
      }))
      .filter((r) => r.value.length > 0)

  if (attrsLoading || (!isCreate && sizeLoading)) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  const initialValues: FormValues = isCreate
    ? { code: '', name: '', sortOrder: 0, valueUnit: '', isActive: true }
    : {
        code: existing?.code ?? '',
        name: existing?.name ?? '',
        sortOrder: existing?.sortOrder ?? 0,
        valueUnit:
          existing?.valueUnit === 'cm' || existing?.valueUnit === 'in' ? existing.valueUnit : '',
        isActive: existing?.isActive ?? true,
      }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/dashboard/sizes" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
        ← Back to sizes
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{isCreate ? 'New size' : 'Edit size'}</h1>
      <p className="text-sm text-slate-600">
        Only fill measurements that apply to this size. Leave blank for attributes you do not use (e.g. no chest on
        track sizes).
      </p>

      {!activeAttrs.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No active measurement attributes yet.{' '}
          <Link to="/dashboard/measurement-attributes/new" className="font-semibold underline">
            Create attributes
          </Link>{' '}
          first.
        </div>
      ) : null}

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={baseSchema}
        onSubmit={(values) => {
          const measurements = buildMeasurements(activeAttrs)
          const payload = {
            code: values.code.trim(),
            name: values.name.trim() || undefined,
            sortOrder: values.sortOrder,
            valueUnit: values.valueUnit === '' ? null : values.valueUnit,
            isActive: values.isActive,
            measurements,
          }
          if (isCreate) {
            createMutation.mutate(payload)
          } else if (id) {
            updateMutation.mutate({ sid: id, payload })
          }
        }}
      >
        {({ isSubmitting, isValid, values }) => (
            <Form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <FormField label="Code" error={<ErrorMessage name="code" />}>
                <Field name="code" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
              </FormField>
              <FormField label="Display name (optional)">
                <Field name="name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </FormField>
              <FormField label="Sort order" hint="Lower numbers appear first in size pickers (e.g. XS=0, S=1, M=2, L=3, XL=4)." error={<ErrorMessage name="sortOrder" />}>
                <Field name="sortOrder" type="number" min={0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </FormField>
              <FormField
                label="Chart unit (optional)"
                hint="Hint for anyone entering numbers; each measurement row still shows the attribute unit when set."
              >
                <Field
                  as="select"
                  name="valueUnit"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Use each attribute’s unit only</option>
                  <option value="cm">Centimetres (cm) — typical for this chart</option>
                  <option value="in">Inches (in) — typical for this chart</option>
                </Field>
              </FormField>
              <div className="flex items-center gap-2">
                <Field name="isActive" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </div>

              {activeAttrs.length > 0 ? (
                <div className="border-t border-slate-200 pt-5">
                  <p className="mb-1 text-sm font-semibold text-slate-800">Measurements (optional per field)</p>
                  <p className="mb-3 text-xs text-slate-500">
                    One size can store many rows (chest, length, shoulder, …). Fill only what applies; leave blank to
                    omit.
                  </p>
                  {values.valueUnit ? (
                    <p className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-900">
                      Chart default: enter numbers in <span className="uppercase">{values.valueUnit}</span> unless an
                      attribute label shows a different unit.
                    </p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeAttrs.map((a) => (
                      <div key={a.id}>
                        <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor={`m-${a.id}`}>
                          {a.label}
                          {a.unit ? ` (${a.unit})` : ''}
                        </label>
                        <input
                          id={`m-${a.id}`}
                          type="text"
                          value={measures[a.id] ?? ''}
                          onChange={(e) => setMeasures((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          placeholder="—"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !isValid ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isCreate ? 'Create size' : 'Save size'}
              </button>
            </Form>
        )}
      </Formik>
    </div>
  )
}

export default SizeForm
