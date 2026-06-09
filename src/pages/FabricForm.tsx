import type { ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Field, Form, Formik, ErrorMessage } from 'formik'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import { createFabric, getFabric, updateFabric } from '../services/fabrics'

const schema = Yup.object({
  slug: Yup.string()
    .trim()
    .required('Slug is required')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, hyphens only'),
  name: Yup.string().trim().required('Name is required').max(120),
  sortOrder: Yup.number().integer().min(0),
  isActive: Yup.boolean().required(),
})

type FormValues = {
  slug: string
  name: string
  sortOrder: number
  isActive: boolean
}

const FabricForm = (): ReactElement => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isCreate = Boolean(useMatch('/dashboard/fabrics/new'))

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-fabric', id],
    queryFn: () => getFabric(id!),
    enabled: !isCreate && Boolean(id),
  })

  const createMutation = useMutation({
    mutationFn: createFabric,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fabrics'] })
      toast.success('Fabric created')
      navigate('/dashboard/fabrics')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ fid, payload }: { fid: string; payload: Record<string, unknown> }) =>
      updateFabric(fid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fabrics'] })
      queryClient.invalidateQueries({ queryKey: ['admin-fabric', id] })
      toast.success('Saved')
      navigate('/dashboard/fabrics')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  if (!isCreate && isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  const initialValues: FormValues = isCreate
    ? { slug: '', name: '', sortOrder: 0, isActive: true }
    : {
        slug: existing?.slug ?? '',
        name: existing?.name ?? '',
        sortOrder: existing?.sortOrder ?? 0,
        isActive: existing?.isActive ?? true,
      }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        to="/dashboard/fabrics"
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">
        {isCreate ? 'New fabric' : 'Edit fabric'}
      </h1>

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={(values) => {
          const payload = {
            slug: values.slug.trim(),
            name: values.name.trim(),
            sortOrder: values.sortOrder,
            isActive: values.isActive,
          }
          if (isCreate) {
            createMutation.mutate(payload)
          } else if (id) {
            updateMutation.mutate({ fid: id, payload })
          }
        }}
      >
        {({ isSubmitting, dirty, isValid }) => (
          <Form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
              <Field
                name="slug"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                placeholder="cotton"
              />
              <p className="mt-1 text-xs text-red-600">
                <ErrorMessage name="slug" />
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Display name</label>
              <Field name="name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <p className="mt-1 text-xs text-red-600">
                <ErrorMessage name="name" />
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sort order</label>
              <Field
                name="sortOrder"
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Lower numbers appear first in product fabric dropdowns.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Field
                name="isActive"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
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

export default FabricForm
