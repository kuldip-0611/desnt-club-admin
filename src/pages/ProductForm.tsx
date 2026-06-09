import type { ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorMessage, Field, FieldArray, Form, Formik } from 'formik'
import { useEffect, useMemo, useState } from 'react'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  appendProductImages,
  createProduct,
  deleteProductImage,
  getProduct,
  productImageUrl,
  updateProduct,
} from '../services/products'
import { listFabrics } from '../services/fabrics'
import { listProductCategories } from '../services/productCategories'
import { listMeasurementAttributes, listSizes } from '../services/sizing'
import type { ProductAudience, UpdateProductPayload } from '../types/product'

const productSchema = Yup.object({
  name: Yup.string().trim().required('Name is required').max(200),
  description: Yup.string().trim().max(10000),
  price: Yup.number()
    .typeError('Enter a valid price')
    .min(0, 'Min 0')
    .required('Price is required'),
  discountPercent: Yup.number()
    .typeError('Enter a number')
    .integer('Whole percent only')
    .min(0, 'Min 0%')
    .max(100, 'Max 100%')
    .required(),
  audience: Yup.mixed<ProductAudience>()
    .oneOf(['MEN', 'WOMEN', 'UNISEX'])
    .required(),
  color: Yup.string().trim().max(100),
  fabrics: Yup.array()
    .of(
      Yup.object({
        fabricId: Yup.string().trim(),
        percent: Yup.number().integer().min(0).max(100).default(0),
      }),
    )
    .test('fabrics-blend', function (rows) {
      const list = rows ?? []
      const filled = list.filter((r) => String(r.fabricId ?? '').trim())
      if (filled.length === 0) {
        for (const r of list) {
          if (Number(r.percent) > 0) {
            return this.createError({ message: 'Pick a fabric for each % row, or remove the row' })
          }
        }
        return true
      }
      for (const r of list) {
        const id = String(r.fabricId ?? '').trim()
        const pct = Number(r.percent)
        if (!id && pct > 0) {
          return this.createError({ message: 'Pick a fabric for each % row, or remove the row' })
        }
        if (id && (!Number.isInteger(pct) || pct < 1 || pct > 100)) {
          return this.createError({ message: 'Each fabric needs a whole percent between 1 and 100' })
        }
      }
      const sum = filled.reduce((a, r) => a + Number(r.percent), 0)
      if (sum !== 100) {
        return this.createError({ message: `Blend must total 100% (currently ${sum}%)` })
      }
      const ids = filled.map((r) => String(r.fabricId).trim())
      if (new Set(ids).size !== ids.length) {
        return this.createError({ message: 'Each fabric can only appear once' })
      }
      return true
    }),
  measurementAttributeIds: Yup.array().of(Yup.string()),
  categoryId: Yup.string().trim().max(36),
  variants: Yup.array()
    .of(
      Yup.object({
        sizeId: Yup.string().nullable(),
        size: Yup.string().when('sizeId', ([sizeId], schema) => {
          const hasCatalog = Boolean(sizeId && String(sizeId).trim())
          if (hasCatalog) {
            return schema.trim().min(1).max(32).required()
          }
          return schema.trim().required('Size label required').max(32)
        }),
        quantity: Yup.number()
          .typeError('Enter quantity')
          .integer('Whole numbers only')
          .min(0, 'Min 0')
          .required('Required'),
      }),
    )
    .min(1, 'Add at least one size row')
    .test(
      'catalog-for-measurements',
      'Choose a catalog size for every row when size-chart measurements are selected',
      function (rows) {
        const mids = (this.parent.measurementAttributeIds as string[] | undefined) ?? []
        if (!mids.length) return true
        return (rows ?? []).every((r) => Boolean(r.sizeId && String(r.sizeId).trim()))
      },
    ),
  isAvailable: Yup.boolean().required(),
})

type VariantRow = { sizeId: string | null; size: string; quantity: number }

type FabricFormRow = { fabricId: string; percent: number }

type FormValues = {
  name: string
  description: string
  price: number
  /** 0 = no discount; 1–100 = percent off list price */
  discountPercent: number
  audience: ProductAudience
  color: string
  fabrics: FabricFormRow[]
  measurementAttributeIds: string[]
  categoryId: string
  variants: VariantRow[]
  isAvailable: boolean
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

const isHexColor = (value: string): boolean => HEX_COLOR_RE.test(value.trim())

/** Browsers require #rrggbb for `type="color"`; use a neutral swatch when the saved value is a text label */
const colorPickerUiValue = (stored: string): string => {
  const t = stored.trim()
  return HEX_COLOR_RE.test(t) ? t.toLowerCase() : '#94a3b8'
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type LocalPickedFileRowProps = {
  file: File
  onRemove: () => void
}

const LocalPickedFileRow = ({ file, onRemove }: LocalPickedFileRowProps): ReactElement => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">…</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  )
}

const sumVariantQty = (rows: { quantity: number }[]): number =>
  rows.reduce((a, v) => a + (Number.isFinite(v.quantity) ? v.quantity : 0), 0)

const ProductForm = (): ReactElement => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id: productId } = useParams<{ id: string }>()
  const isCreate = Boolean(useMatch('/dashboard/products/new'))

  const [newFiles, setNewFiles] = useState<File[]>([])
  const [imageToDelete, setImageToDelete] = useState<string | null>(null)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => getProduct(productId!),
    enabled: !isCreate && Boolean(productId),
  })

  const { data: catalogSizes = [], isLoading: sizesLoading } = useQuery({
    queryKey: ['admin-sizes'],
    queryFn: listSizes,
  })

  const sortedSizes = [...catalogSizes].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
  )

  const { data: productCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: listProductCategories,
  })

  const { data: fabrics = [], isLoading: fabricsLoading } = useQuery({
    queryKey: ['admin-fabrics'],
    queryFn: listFabrics,
  })

  const sortedCategories = [...productCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )

  const sortedFabrics = [...fabrics].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )

  const { data: measurementAttrs = [], isLoading: measurementAttrsLoading } = useQuery({
    queryKey: ['admin-measurement-attributes'],
    queryFn: listMeasurementAttributes,
  })

  const sortedMeasurementAttrs = useMemo(() => {
    return [...measurementAttrs]
      .filter((a) => a.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
  }, [measurementAttrs])

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Product created')
      navigate('/dashboard/products')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Create failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  const appendImagesMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      appendProductImages(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
      setNewFiles([])
    },
    onError: (err: Error) => toast.error(err.message ?? 'Upload failed'),
  })

  const deleteImageMutation = useMutation({
    mutationFn: ({ productId: pid, imageId }: { productId: string; imageId: string }) =>
      deleteProductImage(pid, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
      toast.success('Image removed')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Remove failed'),
  })

  if (!isCreate && !productId) {
    return <p className="text-sm text-red-600">Invalid product.</p>
  }

  if (!isCreate && isLoading) {
    return <p className="text-sm text-slate-500">Loading product…</p>
  }

  const initialValues: FormValues = isCreate
    ? {
        name: '',
        description: '',
        price: 0,
        discountPercent: 0,
        audience: 'UNISEX',
        color: '',
        fabrics: [],
        measurementAttributeIds: [],
        categoryId: '',
        variants: [{ sizeId: null, size: '', quantity: 0 }],
        isAvailable: true,
      }
    : {
        name: existing?.name ?? '',
        description: existing?.description ?? '',
        price: existing?.price ?? 0,
        discountPercent:
          existing?.discountPercent != null && existing.discountPercent > 0
            ? existing.discountPercent
            : 0,
        audience: existing?.audience ?? 'UNISEX',
        color: existing?.color ?? '',
        fabrics:
          existing?.productFabrics?.length && existing.productFabrics.length > 0
            ? existing.productFabrics.map((pf) => ({
                fabricId: pf.fabricId,
                percent: pf.percent,
              }))
            : [],
        measurementAttributeIds:
          existing?.measurementAttributes?.map((a) => a.id) ?? [],
        categoryId: existing?.categoryId ?? existing?.category?.id ?? '',
        variants:
          existing?.variants?.length && existing.variants.length > 0
            ? existing.variants.map((v) => ({
                sizeId: v.sizeId ?? null,
                size: v.size,
                quantity: v.quantity,
              }))
            : [{ sizeId: null, size: 'One size', quantity: existing?.quantity ?? 0 }],
        isAvailable: existing?.isAvailable ?? true,
      }

  const handleSubmit = async (values: FormValues) => {
    const variantPayload = values.variants.map((v) => {
      const row: { size: string; quantity: number; sizeId?: string } = {
        size: v.size.trim(),
        quantity: Math.max(0, Math.floor(Number(v.quantity))),
      }
      const sid = v.sizeId?.trim()
      if (sid) row.sizeId = sid
      return row
    })
    const totalQty = sumVariantQty(variantPayload)

    const fabricPayload = values.fabrics
      .filter((r) => String(r.fabricId ?? '').trim())
      .map((r) => ({
        fabricId: String(r.fabricId).trim(),
        percent: Math.min(100, Math.max(1, Math.floor(Number(r.percent)))),
      }))

    if (isCreate) {
      const fd = new FormData()
      fd.append('name', values.name.trim())
      fd.append('description', values.description.trim())
      fd.append('price', String(values.price))
      fd.append('quantity', String(totalQty))
      fd.append('audience', values.audience)
      fd.append('color', values.color.trim())
      if (fabricPayload.length > 0) {
        fd.append('fabrics', JSON.stringify(fabricPayload))
      }
      if (values.measurementAttributeIds.length > 0) {
        fd.append('measurementAttributeIds', JSON.stringify(values.measurementAttributeIds))
      }
      fd.append('variants', JSON.stringify(variantPayload))
      fd.append('isAvailable', String(values.isAvailable))
      if (values.discountPercent >= 1) {
        fd.append('discountPercent', String(Math.min(100, Math.floor(values.discountPercent))))
      }
      const cid = values.categoryId.trim()
      if (cid) {
        fd.append('categoryId', cid)
      }
      newFiles.forEach((file) => fd.append('images', file))
      await createMutation.mutateAsync(fd)
      return
    }

    if (!productId) return

    const payload: UpdateProductPayload = {
      name: values.name.trim(),
      description: values.description.trim(),
      price: values.price,
      audience: values.audience,
      color: values.color.trim() || null,
      fabrics: fabricPayload,
      measurementAttributeIds: values.measurementAttributeIds,
      categoryId: values.categoryId.trim() || null,
      isAvailable: values.isAvailable,
      discountPercent:
        values.discountPercent >= 1
          ? Math.min(100, Math.floor(values.discountPercent))
          : null,
      variants: variantPayload,
    }

    await updateMutation.mutateAsync({ id: productId, payload })

    if (newFiles.length > 0) {
      const fd = new FormData()
      newFiles.forEach((file) => fd.append('images', file))
      await appendImagesMutation.mutateAsync({ id: productId, formData: fd })
    }

    toast.success('Product saved')
    navigate('/dashboard/products')
  }

  const title = isCreate ? 'Add product' : 'Edit product'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pick sizes from your catalog or type a custom label. Stock is tracked per row; total updates
            automatically.
          </p>
        </div>
        <Link
          to="/dashboard/products"
          className="shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          ← Back to catalog
        </Link>
      </div>

      <Formik<FormValues>
        enableReinitialize
        initialValues={initialValues}
        validationSchema={productSchema}
        onSubmit={handleSubmit}
      >
        {({ values, handleChange, handleBlur, isSubmitting, dirty, isValid, setFieldValue }) => {
          const saving =
            isSubmitting ||
            createMutation.isPending ||
            updateMutation.isPending ||
            appendImagesMutation.isPending

          const hasChanges = isCreate || dirty || newFiles.length > 0

          const disableSubmit = saving || !isValid || !hasChanges

          const totalQty = sumVariantQty(values.variants)
          const fabricSum = values.fabrics
            .filter((r) => String(r.fabricId ?? '').trim())
            .reduce((a, r) => a + (Number.isFinite(Number(r.percent)) ? Number(r.percent) : 0), 0)
          const requireCatalog = values.measurementAttributeIds.length > 0

          return (
            <Form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-1 text-xs text-red-600">
                  <ErrorMessage name="name" />
                </p>
              </div>

              <div>
                <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={values.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-1 text-xs text-red-600">
                  <ErrorMessage name="description" />
                </p>
              </div>

              <div>
                <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={values.categoryId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={categoriesLoading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                >
                  <option value="">None</option>
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!c.isActive ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>T-shirt, tracks, hoodies, …</span>
                  <Link
                    to="/dashboard/product-categories/new"
                    className="font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    New category
                  </Link>
                </p>
                <p className="mt-1 text-xs text-red-600">
                  <ErrorMessage name="categoryId" />
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="price" className="mb-1 block text-sm font-medium text-slate-700">
                    Price (USD)
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min={0}
                    value={values.price}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-xs text-red-600">
                    <ErrorMessage name="price" />
                  </p>
                </div>
                <div>
                  <label htmlFor="audience" className="mb-1 block text-sm font-medium text-slate-700">
                    For
                  </label>
                  <select
                    id="audience"
                    name="audience"
                    value={values.audience}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="UNISEX">Unisex</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
                <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                  <div>
                    <label
                      htmlFor="discountPercent"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Discount (%)
                    </label>
                    <input
                      id="discountPercent"
                      name="discountPercent"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={values.discountPercent}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      0 = no promotion. Customers see the original price struck through and the discounted price.
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      <ErrorMessage name="discountPercent" />
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    {values.discountPercent >= 1 && Number(values.price) > 0 ? (
                      <p>
                        <span className="text-slate-500">Preview: </span>
                        <span className="text-slate-400 line-through">
                          ${Number(values.price).toFixed(2)}
                        </span>
                        <span className="ml-2 font-semibold text-emerald-700">
                          $
                          {(
                            Math.round(
                              Number(values.price) *
                                (100 - Math.min(100, Math.floor(values.discountPercent))),
                            ) / 100
                          ).toFixed(2)}
                        </span>
                        <span className="ml-1 text-xs text-slate-500">
                          ({Math.min(100, Math.floor(values.discountPercent))}% off)
                        </span>
                      </p>
                    ) : (
                      <p className="text-slate-500">No discount on the storefront.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-sm font-medium text-slate-700">Color</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      aria-label="Pick color (saves as hex)"
                      title="Pick a color"
                      className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 shadow-sm"
                      value={colorPickerUiValue(values.color)}
                      onChange={(e) => setFieldValue('color', e.target.value)}
                    />
                    {isHexColor(values.color) ? (
                      <span
                        className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 shadow-inner"
                        style={{ backgroundColor: values.color.trim() }}
                        title="Saved color preview"
                      />
                    ) : null}
                    <input
                      id="color"
                      name="color"
                      type="text"
                      placeholder="#1e3a8a or Navy"
                      value={values.color}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="min-w-[8rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-xs text-slate-500">
                      The swatch saves <span className="font-mono">#RRGGBB</span>. You can type a name instead; the
                      picker shows neutral gray until the field is hex.
                    </p>
                    {values.color.trim() ? (
                      <button
                        type="button"
                        onClick={() => setFieldValue('color', '')}
                        className="text-xs font-semibold text-slate-600 underline decoration-slate-300 hover:text-slate-900"
                      >
                        Clear color
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-red-600">
                    <ErrorMessage name="color" />
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-slate-700">Fabric blend</label>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        fabricSum === 100 ? 'text-emerald-700' : fabricSum > 0 ? 'text-amber-800' : 'text-slate-500'
                      }`}
                    >
                      Total {fabricSum}% / 100%
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-slate-500">
                    Add one row per material (e.g. 60% cotton, 40% polyester). Percentages must add up to 100, or leave
                    empty for no blend.
                  </p>
                  <FieldArray name="fabrics">
                    {({ push, remove }) => (
                      <div className="space-y-2">
                        {values.fabrics.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-sm text-slate-600">
                            No fabrics listed yet.
                          </p>
                        ) : null}
                        {values.fabrics.map((_, idx) => (
                          <div
                            key={`fabric-${idx}`}
                            className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                          >
                            <div className="min-w-[160px] flex-[2]">
                              <label
                                className="mb-0.5 block text-xs font-medium text-slate-600"
                                htmlFor={`fabrics.${idx}.fabricId`}
                              >
                                Fabric
                              </label>
                              <Field
                                as="select"
                                id={`fabrics.${idx}.fabricId`}
                                name={`fabrics.${idx}.fabricId`}
                                disabled={fabricsLoading}
                                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 disabled:opacity-60"
                              >
                                <option value="">Select…</option>
                                {sortedFabrics.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                    {!f.isActive ? ' (inactive)' : ''}
                                  </option>
                                ))}
                              </Field>
                            </div>
                            <div className="min-w-[88px] w-24">
                              <label
                                className="mb-0.5 block text-xs font-medium text-slate-600"
                                htmlFor={`fabrics.${idx}.percent`}
                              >
                                %
                              </label>
                              <Field
                                id={`fabrics.${idx}.percent`}
                                name={`fabrics.${idx}.percent`}
                                type="number"
                                min={0}
                                max={100}
                                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="mb-0.5 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => push({ fabricId: '', percent: 0 })}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                          >
                            + Add fabric
                          </button>
                          <Link
                            to="/dashboard/fabrics/new"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                          >
                            New fabric type
                          </Link>
                        </div>
                      </div>
                    )}
                  </FieldArray>
                  <p className="mt-1 text-xs text-red-600">
                    <ErrorMessage name="fabrics" />
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-sm font-medium text-slate-800">Size chart measurements</p>
                <p className="mt-1 text-xs text-slate-600">
                  Example: for a T-shirt select chest, shoulder, and length — not thigh or inseam. Leave all unchecked
                  only if every size row uses a custom label (no catalog chart). When anything is checked, each size
                  row must use a <strong>catalog size</strong>, and that size must list these measurements under{' '}
                  <span className="font-medium">Admin → Sizes</span>.
                </p>
                {measurementAttrsLoading ? (
                  <p className="mt-2 text-xs text-slate-400">Loading measurement attributes…</p>
                ) : sortedMeasurementAttrs.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-800">
                    No measurement attributes yet.{' '}
                    <Link
                      to="/dashboard/measurement-attributes/new"
                      className="font-semibold text-indigo-600 underline hover:text-indigo-500"
                    >
                      Create attributes
                    </Link>{' '}
                    first.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sortedMeasurementAttrs.map((a) => (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          checked={values.measurementAttributeIds.includes(a.id)}
                          onChange={() => {
                            const has = values.measurementAttributeIds.includes(a.id)
                            const nextSet = new Set(values.measurementAttributeIds)
                            if (has) nextSet.delete(a.id)
                            else nextSet.add(a.id)
                            const ordered = sortedMeasurementAttrs
                              .filter((x) => nextSet.has(x.id))
                              .map((x) => x.id)
                            setFieldValue('measurementAttributeIds', ordered)
                          }}
                        />
                        <span>
                          {a.label}
                          {a.unit ? ` (${a.unit})` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Sizes &amp; stock</p>
                    <p className="text-xs text-slate-500">
                      {requireCatalog
                        ? 'Catalog size is required for every row so measurements match your size chart.'
                        : 'Choose a catalog size or "Custom" to type a label (e.g. one size).'}
                    </p>
                    {sizesLoading ? (
                      <p className="mt-1 text-xs text-slate-400">Loading catalog sizes…</p>
                    ) : sortedSizes.length === 0 ? (
                      <p className="mt-1 text-xs text-amber-800">
                        No sizes in catalog yet.{' '}
                        <Link
                          to="/dashboard/sizes/new"
                          className="font-semibold text-indigo-600 underline hover:text-indigo-500"
                        >
                          Add sizes
                        </Link>{' '}
                        first, or use custom labels only.
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm tabular-nums text-slate-600">
                    Total units:{' '}
                    <span className="font-semibold text-slate-900">{totalQty}</span>
                  </p>
                </div>
                <FieldArray name="variants">
                  {({ push, remove }) => (
                    <div className="space-y-2">
                      {values.variants.map((_, idx) => (
                        <div
                          key={`variant-${idx}`}
                          className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                        >
                          <div className="min-w-[160px] flex-[2]">
                            <label
                              className="mb-0.5 block text-xs font-medium text-slate-600"
                              htmlFor={`variants.${idx}.catalog-size`}
                            >
                              Catalog size
                            </label>
                            <select
                              id={`variants.${idx}.catalog-size`}
                              value={values.variants[idx]?.sizeId ?? ''}
                              disabled={sizesLoading}
                              onChange={(e) => {
                                const id = e.target.value
                                if (!id) {
                                  setFieldValue(`variants.${idx}.sizeId`, null)
                                  return
                                }
                                const row = sortedSizes.find((s) => s.id === id)
                                setFieldValue(`variants.${idx}.sizeId`, id)
                                setFieldValue(`variants.${idx}.size`, row?.code ?? '')
                              }}
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 disabled:opacity-60"
                            >
                              <option value="" disabled={requireCatalog}>
                                {requireCatalog
                                  ? 'Select catalog size (required)'
                                  : 'Custom (type label below)'}
                              </option>
                              {sortedSizes.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.code}
                                  {s.name ? ` — ${s.name}` : ''}
                                  {!s.isActive ? ' (inactive)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="min-w-[100px] flex-1">
                            <label
                              className="mb-0.5 block text-xs font-medium text-slate-600"
                              htmlFor={`variants.${idx}.size`}
                            >
                              Size label
                            </label>
                            <Field
                              id={`variants.${idx}.size`}
                              name={`variants.${idx}.size`}
                              disabled={Boolean(values.variants[idx]?.sizeId)}
                              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-600"
                              placeholder="e.g. M or One size"
                            />
                            <p className="mt-0.5 text-xs text-slate-500">
                              {values.variants[idx]?.sizeId
                                ? 'Set from catalog; change dropdown to edit.'
                                : 'Shown on the storefront.'}
                            </p>
                            <p className="mt-0.5 text-xs text-red-600">
                              <ErrorMessage name={`variants.${idx}.size`} />
                            </p>
                          </div>
                          <div className="w-28">
                            <label
                              className="mb-0.5 block text-xs font-medium text-slate-600"
                              htmlFor={`variants.${idx}.quantity`}
                            >
                              Qty
                            </label>
                            <Field
                              id={`variants.${idx}.quantity`}
                              name={`variants.${idx}.quantity`}
                              type="number"
                              min={0}
                              step={1}
                              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums outline-none focus:border-indigo-500"
                            />
                            <p className="mt-0.5 text-xs text-red-600">
                              <ErrorMessage name={`variants.${idx}.quantity`} />
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (values.variants.length <= 1) {
                                toast.warn('Keep at least one size row.')
                                return
                              }
                              remove(idx)
                            }}
                            className="ml-auto mt-5 shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => push({ sizeId: null, size: '', quantity: 0 })}
                        className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add size row
                      </button>
                      <p className="text-xs text-red-600">
                        <ErrorMessage name="variants" />
                      </p>
                    </div>
                  )}
                </FieldArray>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="isAvailable"
                  name="isAvailable"
                  type="checkbox"
                  checked={values.isAvailable}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isAvailable" className="text-sm font-medium text-slate-700">
                  Available for sale
                </label>
              </div>

              <div>
                <label htmlFor="images" className="mb-1 block text-sm font-medium text-slate-700">
                  {isCreate ? 'Images' : 'Add images'}
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Choose files from your computer. Remove any before saving — only remaining images will be uploaded.
                </p>
                <input
                  id="images"
                  name="images"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? [])
                    if (!picked.length) return
                    setNewFiles((prev) => {
                      const merged = [...prev, ...picked]
                      const seen = new Set<string>()
                      return merged.filter((f) => {
                        const key = `${f.name}-${f.size}-${f.lastModified}`
                        if (seen.has(key)) return false
                        seen.add(key)
                        return true
                      })
                    })
                    e.target.value = ''
                  }}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {newFiles.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {newFiles.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                        <LocalPickedFileRow
                          file={file}
                          onRemove={() => {
                            setNewFiles((prev) => prev.filter((_, i) => i !== index))
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No images selected yet.</p>
                )}
              </div>

              {!isCreate && existing?.images?.length ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Current images</p>
                  <div className="flex flex-wrap gap-3">
                    {existing.images.map((img) => (
                      <div key={img.id} className="relative">
                        <img
                          src={productImageUrl(img.path)}
                          alt=""
                          className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageToDelete(img.id)
                          }}
                          disabled={deleteImageMutation.isPending}
                          className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow hover:bg-red-500 disabled:opacity-50"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={disableSubmit}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : isCreate ? 'Create product' : 'Save changes'}
              </button>
            </Form>
          )
        }}
      </Formik>
      <ConfirmDeleteModal
        isOpen={imageToDelete != null}
        title="Remove image"
        message="Remove this image from the product?"
        confirmLabel="Remove"
        isLoading={deleteImageMutation.isPending}
        onClose={() => setImageToDelete(null)}
        onConfirm={() => {
          if (!productId || !imageToDelete) return
          deleteImageMutation.mutate(
            { productId, imageId: imageToDelete },
            {
              onSuccess: () => setImageToDelete(null),
            },
          )
        }}
      />
    </div>
  )
}

export default ProductForm
