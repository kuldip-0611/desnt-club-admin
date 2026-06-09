import type { ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Field, Form, Formik, ErrorMessage } from 'formik'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import FormField from '../components/ui/FormField'
import {
  createMeasurementAttribute,
  getMeasurementAttribute,
  updateMeasurementAttribute,
} from '../services/sizing'

const schema = Yup.object({
  slug: Yup.string()
    .trim()
    .required('Slug is required')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, hyphens only'),
  label: Yup.string().trim().required('Label is required').max(120),
  unit: Yup.string().oneOf(['', 'cm', 'in'], 'Pick a unit or leave as none'),
  isActive: Yup.boolean().required(),
})

type FormValues = {
  slug: string
  label: string
  unit: '' | 'cm' | 'in'
  isActive: boolean
}

/** Map legacy DB text to dropdown values */
const normalizeMeasurementUnit = (u: string | null | undefined): '' | 'cm' | 'in' => {
  const t = (u ?? '').trim().toLowerCase()
  if (t === 'cm' || t.startsWith('centi')) return 'cm'
  if (t === 'in' || t.startsWith('inch')) return 'in'
  return ''
}

const MeasurementAttributeForm = (): ReactElement => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isCreate = Boolean(useMatch('/dashboard/measurement-attributes/new'))

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-measurement-attribute', id],
    queryFn: () => getMeasurementAttribute(id!),
    enabled: !isCreate && Boolean(id),
  })

  const createMutation = useMutation({
    mutationFn: createMeasurementAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-measurement-attributes'] })
      toast.success('Attribute created')
      navigate('/dashboard/measurement-attributes')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ aid, payload }: { aid: string; payload: Record<string, unknown> }) =>
      updateMeasurementAttribute(aid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-measurement-attributes'] })
      queryClient.invalidateQueries({ queryKey: ['admin-measurement-attribute', id] })
      toast.success('Saved')
      navigate('/dashboard/measurement-attributes')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  if (!isCreate && isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  const initialValues: FormValues = isCreate
    ? { slug: '', label: '', unit: '', isActive: true }
    : {
        slug: existing?.slug ?? '',
        label: existing?.label ?? '',
        unit: normalizeMeasurementUnit(existing?.unit ?? ''),
        isActive: existing?.isActive ?? true,
      }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        to="/dashboard/measurement-attributes"
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">
        {isCreate ? 'New measurement attribute' : 'Edit attribute'}
      </h1>

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={(values) => {
          const unitPayload = values.unit === '' ? null : values.unit
          const payload = {
            slug: values.slug.trim(),
            label: values.label.trim(),
            unit: unitPayload,
            isActive: values.isActive,
          }
          if (isCreate) {
            createMutation.mutate(payload)
          } else if (id) {
            const { slug: _slug, ...rest } = payload
            updateMutation.mutate({ aid: id, payload: rest })
          }
        }}
      >
        {({ isSubmitting, dirty, isValid }) => (
          <Form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <FormField
              label="Slug (API key)"
              error={<ErrorMessage name="slug" />}
              hint={!isCreate ? 'Slug cannot be changed after creation.' : undefined}
            >
              <Field
                name="slug"
                disabled={!isCreate}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-100"
                placeholder="chest"
              />
            </FormField>
            <FormField label="Display label" error={<ErrorMessage name="label" />}>
              <Field name="label" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Unit" hint="Shown next to this field on size charts (e.g. Chest (cm)).">
              <Field
                as="select"
                name="unit"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">None</option>
                <option value="cm">Centimetres (cm)</option>
                <option value="in">Inches (in)</option>
              </Field>
            </FormField>
            <div className="flex items-center gap-2">
              <Field name="isActive" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </div>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !isValid ||
                (!isCreate && !dirty) ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isCreate ? 'Create' : 'Save'}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default MeasurementAttributeForm
