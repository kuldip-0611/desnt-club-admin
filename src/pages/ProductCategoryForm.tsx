import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Field, Form, Formik, ErrorMessage } from 'formik'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import { CategorySubcategoriesManager } from '../components/CategorySubcategoriesManager'
import {
  SubcategoryDraftFields,
  type SubcategoryDraft,
} from '../components/SubcategoryDraftFields'
import FormField from '../components/ui/FormField'
import {
  createProductCategory,
  getProductCategory,
  updateProductCategory,
} from '../services/productCategories'
import { createProductCategorySubcategory } from '../services/productCategorySubcategories'
import { slugify } from '../utils/slugify'
import { getBasicSettings } from '../services/settings'
import type { UpdateProductCategoryPayload } from '../types/productCategory'

const schema = Yup.object({
  slug: Yup.string()
    .trim()
    .required('Slug is required')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, hyphens only'),
  name: Yup.string().trim().required('Name is required').max(120),
  isActive: Yup.boolean().required(),
})

type FormValues = {
  slug: string
  name: string
  isActive: boolean
}

const ProductCategoryForm = (): ReactElement => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isCreate = Boolean(useMatch('/dashboard/product-categories/new'))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<SubcategoryDraft[]>([
    { name: '', slug: '', sortOrder: 0, imageFile: null },
  ])
  const [isSaving, setIsSaving] = useState(false)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-product-category', id],
    queryFn: () => getProductCategory(id!),
    enabled: !isCreate && Boolean(id),
  })
  const { data: settings } = useQuery({
    queryKey: ['basic-settings'],
    queryFn: getBasicSettings,
  })

  const createMutation = useMutation({
    mutationFn: createProductCategory,
  })

  const updateMutation = useMutation({
    mutationFn: ({ cid, payload }: { cid: string; payload: UpdateProductCategoryPayload }) =>
      updateProductCategory(cid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product-category', id] })
      toast.success('Saved')
      navigate('/dashboard/product-categories')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  if (!isCreate && isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  const initialValues: FormValues = isCreate
    ? { slug: '', name: '', isActive: true }
    : {
        slug: existing?.slug ?? '',
        name: existing?.name ?? '',
        isActive: existing?.isActive ?? true,
      }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/dashboard/product-categories"
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">
        {isCreate ? 'New product category' : 'Edit category'}
      </h1>

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={async (values) => {
          if (isCreate && !imageFile) {
            toast.error('Category image is required')
            return
          }
          const payload = {
            slug: values.slug.trim(),
            name: values.name.trim(),
            isActive: values.isActive,
          }
          if (isCreate) {
            const drafts = subcategoryDrafts
              .map((row, index) => ({ ...row, sortOrder: index }))
              .filter((row) => row.name.trim() && row.slug.trim())
            for (const row of drafts) {
              const normalizedSlug = slugify(row.slug)
              if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
                toast.error(`Invalid subcategory slug: ${row.name.trim() || row.slug}`)
                return
              }
              if (!row.imageFile) {
                toast.error(`Image is required for subcategory "${row.name.trim() || normalizedSlug}"`)
                return
              }
            }
            setIsSaving(true)
            try {
              const category = await createMutation.mutateAsync({
                ...payload,
                image: imageFile as File,
              })
              for (const row of drafts) {
                await createProductCategorySubcategory(category.id, {
                  slug: slugify(row.slug),
                  name: row.name.trim(),
                  sortOrder: row.sortOrder,
                  isActive: true,
                  image: row.imageFile as File,
                })
              }
              await queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] })
              if (drafts.length > 0) {
                await queryClient.invalidateQueries({
                  queryKey: ['admin-category-subcategories', category.id],
                })
              }
              toast.success(
                drafts.length > 0
                  ? `Category created with ${drafts.length} subcategor${drafts.length === 1 ? 'y' : 'ies'}`
                  : 'Category created',
              )
              navigate(`/dashboard/product-categories/${category.id}/edit`)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Save failed')
            } finally {
              setIsSaving(false)
            }
            return
          }
          if (id) {
            updateMutation.mutate({ cid: id, payload: { ...payload, ...(imageFile ? { image: imageFile } : {}) } })
          }
        }}
      >
        {({ isSubmitting, dirty, isValid }) => (
          <Form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <FormField label="Slug" error={<ErrorMessage name="slug" />}>
              <Field
                name="slug"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                placeholder="t-shirt"
              />
            </FormField>
            <FormField label="Display name" error={<ErrorMessage name="name" />}>
              <Field name="name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField
              label={`Category image ${isCreate ? '(required)' : '(optional to replace)'}`}
              hint={imageFile ? imageFile.name : existing?.image ? 'Current image already saved.' : 'No image selected.'}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0] ?? null
                  if (!file) {
                    setImageFile(null)
                    return
                  }
                  const maxBytes = settings?.uploads.limits.categoryImageMaxBytes ?? 2 * 1024 * 1024
                  const allowed = new Set(settings?.uploads.image.mimeTypes ?? [
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                  ])
                  if (!allowed.has(file.type)) {
                    toast.error('Only JPEG, PNG, GIF, or WebP images are allowed')
                    e.currentTarget.value = ''
                    return
                  }
                  if (file.size > maxBytes) {
                    toast.error(`Category image must be <= ${(maxBytes / (1024 * 1024)).toFixed(0)} MB`)
                    e.currentTarget.value = ''
                    return
                  }
                  setImageFile(file)
                }}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </FormField>
            <div className="flex items-center gap-2">
              <Field name="isActive" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </div>
            {isCreate ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Subcategories (optional)</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Add types now (e.g. round neck, v-neck). You can change them later on the edit page.
                  </p>
                </div>
                <SubcategoryDraftFields rows={subcategoryDrafts} onChange={setSubcategoryDrafts} />
              </section>
            ) : null}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isSaving ||
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

      {!isCreate && id ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Subcategories</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add types under this category (round neck, v-neck, …). They appear in the product form dropdown.
          </p>
          <div className="mt-4">
            <CategorySubcategoriesManager categoryId={id} categoryName={existing?.name} compact />
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default ProductCategoryForm
