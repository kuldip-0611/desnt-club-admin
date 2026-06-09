import type { FormEvent, ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'react-toastify'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import DataTable, { type DataTableColumn } from './ui/DataTable'
import {
  createProductCategorySubcategory,
  deleteProductCategorySubcategory,
  listProductSubcategoriesByCategory,
  subcategoryImageUrl,
  updateProductCategorySubcategory,
} from '../services/productCategorySubcategories'
import type { ProductCategorySubcategory } from '../types/productCategorySubcategory'
import { slugify } from '../utils/slugify'

type CategorySubcategoriesManagerProps = {
  categoryId: string
  categoryName?: string
  compact?: boolean
}

export const CategorySubcategoriesManager = ({
  categoryId,
  categoryName,
  compact = false,
}: CategorySubcategoriesManagerProps): ReactElement => {
  const queryClient = useQueryClient()
  const [rowToDelete, setRowToDelete] = useState<ProductCategorySubcategory | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [slugTouched, setSlugTouched] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-category-subcategories', categoryId],
    queryFn: () => listProductSubcategoriesByCategory(categoryId),
    enabled: Boolean(categoryId),
  })

  const clearImageState = (): void => {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
  }

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-category-subcategories', categoryId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-subcategories', categoryId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] }),
    ])

  const createMutation = useMutation({
    mutationFn: () =>
      createProductCategorySubcategory(categoryId, {
        slug: slugify(slug),
        name: name.trim(),
        sortOrder: Math.max(0, Math.floor(Number(sortOrder))),
        isActive: true,
        image: imageFile as File,
      }),
    onSuccess: () => {
      void invalidate()
      setSlug('')
      setName('')
      setSortOrder(0)
      setSlugTouched(false)
      setEditingId(null)
      clearImageState()
      toast.success('Subcategory created')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Create failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateProductCategorySubcategory(id, { isActive }),
    onSuccess: () => void invalidate(),
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const editSaveMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { slug: string; name: string; sortOrder: number; image?: File }
    }) => updateProductCategorySubcategory(id, payload),
    onSuccess: () => {
      void invalidate()
      cancelEdit()
      toast.success('Subcategory saved')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProductCategorySubcategory,
    onSuccess: () => {
      void invalidate()
      toast.success('Subcategory deleted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const cancelEdit = (): void => {
    setEditingId(null)
    setSlug('')
    setName('')
    setSortOrder(0)
    setSlugTouched(false)
    clearImageState()
  }

  const startEdit = (row: ProductCategorySubcategory): void => {
    setEditingId(row.id)
    setSlug(row.slug)
    setName(row.name)
    setSortOrder(row.sortOrder ?? 0)
    setSlugTouched(true)
    clearImageState()
    if (row.image) {
      setImagePreview(subcategoryImageUrl(row.image))
    }
  }

  const handleNameChange = (next: string): void => {
    setName(next)
    if (!slugTouched && !editingId) {
      setSlug(slugify(next))
    }
  }

  const handleImagePick = (file: File | null): void => {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const handleSubmitNew = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const s = slugify(slug)
    const n = name.trim()
    if (!s || !n) {
      toast.error('Slug and name are required')
      return
    }
    if (!imageFile) {
      toast.error('Subcategory image is required')
      return
    }
    createMutation.mutate()
  }

  const columns: DataTableColumn<ProductCategorySubcategory>[] = [
    {
      key: 'image',
      header: 'Image',
      render: (r) =>
        r.image ? (
          <img
            src={subcategoryImageUrl(r.image)}
            alt=""
            className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="font-mono text-xs text-slate-600">{r.slug}</span> },
    { key: 'sort', header: 'Order', render: (r) => <span className="text-sm text-slate-600">{r.sortOrder}</span> },
    {
      key: 'active',
      header: 'Active',
      render: (r) => (
        <button
          type="button"
          onClick={() => toggleMutation.mutate({ id: r.id, isActive: !r.isActive })}
          disabled={toggleMutation.isPending}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            r.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {r.isActive ? 'On' : 'Off'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (r) => (
        <>
          <button type="button" onClick={() => startEdit(r)} className="mr-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            Edit
          </button>
          <button type="button" onClick={() => setRowToDelete(r)} className="text-sm font-semibold text-red-600 hover:text-red-500">
            Delete
          </button>
        </>
      ),
    },
  ]

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading subcategories…</p>
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Could not load subcategories</p>
        <p className="mt-1">{error instanceof Error ? error.message : 'Request failed'}</p>
        <p className="mt-2 text-xs">
          Restart the backend so database alignment runs, or run{' '}
          <code className="rounded bg-red-100 px-1">yarn db:align-product-subcategories</code> in desent-club-backend.
        </p>
        <button type="button" onClick={() => void refetch()} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {!compact ? (
        <p className="text-sm text-slate-600">
          Sub-types under <strong>{categoryName ?? 'this category'}</strong> (e.g. round neck, v-neck). Image is required for each subcategory.
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{editingId ? 'Edit subcategory' : 'Add subcategory'}</h3>
        {editingId ? (
          <form
            className="mt-3 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const s = slugify(slug)
              const n = name.trim()
              if (!s || !n) {
                toast.error('Slug and name are required')
                return
              }
              editSaveMutation.mutate({
                id: editingId,
                payload: {
                  slug: s,
                  name: n,
                  sortOrder: Math.max(0, Math.floor(Number(sortOrder))),
                  ...(imageFile ? { image: imageFile } : {}),
                },
              })
            }}
          >
            <FormFields
              slug={slug}
              name={name}
              sortOrder={sortOrder}
              imagePreview={imagePreview}
              requireImage={false}
              onSlugChange={(v) => {
                setSlugTouched(true)
                setSlug(v)
              }}
              onNameChange={handleNameChange}
              onSortOrderChange={setSortOrder}
              onImageChange={handleImagePick}
            />
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={editSaveMutation.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                Save
              </button>
              <button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmitNew}>
            <FormFields
              slug={slug}
              name={name}
              sortOrder={sortOrder}
              imagePreview={imagePreview}
              requireImage
              onSlugChange={(v) => {
                setSlugTouched(true)
                setSlug(v)
              }}
              onNameChange={handleNameChange}
              onSortOrderChange={setSortOrder}
              onImageChange={handleImagePick}
            />
            <div className="flex items-end sm:col-span-2">
              <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                {createMutation.isPending ? 'Adding…' : 'Add subcategory'}
              </button>
            </div>
          </form>
        )}
      </div>

      {!rows.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
          No subcategories yet. Add types like round neck or oversized fit.
        </p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
      )}

      <ConfirmDeleteModal
        isOpen={rowToDelete != null}
        title="Delete subcategory"
        message={rowToDelete ? `Delete "${rowToDelete.name}"? Linked products will lose this subcategory.` : ''}
        isLoading={deleteMutation.isPending}
        onClose={() => setRowToDelete(null)}
        onConfirm={() => {
          if (!rowToDelete) return
          deleteMutation.mutate(rowToDelete.id, { onSuccess: () => setRowToDelete(null) })
        }}
      />
    </div>
  )
}

type FormFieldsProps = {
  slug: string
  name: string
  sortOrder: number
  imagePreview: string | null
  requireImage: boolean
  onSlugChange: (value: string) => void
  onNameChange: (value: string) => void
  onSortOrderChange: (value: number) => void
  onImageChange: (file: File | null) => void
}

const FormFields = ({
  slug,
  name,
  sortOrder,
  imagePreview,
  requireImage,
  onSlugChange,
  onNameChange,
  onSortOrderChange,
  onImageChange,
}: FormFieldsProps): ReactElement => (
  <>
    <div>
      <label htmlFor="sub-name" className="mb-1 block text-xs font-medium text-slate-700">
        Name <span className="text-red-600">*</span>
      </label>
      <input
        id="sub-name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Round neck"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
    </div>
    <div>
      <label htmlFor="sub-slug" className="mb-1 block text-xs font-medium text-slate-700">
        Slug <span className="text-red-600">*</span>
      </label>
      <input
        id="sub-slug"
        value={slug}
        onChange={(e) => onSlugChange(e.target.value)}
        placeholder="round-neck"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
      />
    </div>
    <div className="sm:col-span-2">
      <label htmlFor="sub-image" className="mb-1 block text-xs font-medium text-slate-700">
        Image {requireImage ? <span className="text-red-600">*</span> : <span className="text-slate-500">(optional when editing)</span>}
      </label>
      <input
        id="sub-image"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
        className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700"
      />
      {imagePreview ? (
        <img src={imagePreview} alt="" className="mt-2 h-20 w-20 rounded-lg border border-slate-200 object-cover" />
      ) : null}
    </div>
    <div>
      <label htmlFor="sub-order" className="mb-1 block text-xs font-medium text-slate-700">
        Sort order
      </label>
      <input
        id="sub-order"
        type="number"
        min={0}
        value={sortOrder}
        onChange={(e) => onSortOrderChange(Number(e.target.value))}
        className="w-full max-w-[8rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
    </div>
  </>
)
