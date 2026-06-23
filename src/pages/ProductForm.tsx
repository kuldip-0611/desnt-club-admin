import type { ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorMessage, Field, FieldArray, Form, Formik } from 'formik'
import { useEffect, useMemo, useState } from 'react'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  appendProductImages,
  createProduct,
  deleteProductImage,
  getProduct,
  productImageUrl,
  reorderProductImages,
  updateProductImageColor,
  updateProduct,
} from '../services/products'
import { listFabrics } from '../services/fabrics'
import { listProductCategories } from '../services/productCategories'
import { listMeasurementAttributes, listSizes } from '../services/sizing'
import { listProductSubcategoriesByCategory } from '../services/productCategorySubcategories'
import { getBasicSettings } from '../services/settings'
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
  categoryId: Yup.string().trim().required('Category is required'),
  subcategoryId: Yup.string().trim().max(36),
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
        colorName: Yup.string().trim().required('Color name is required').max(100),
        colorHex: Yup.string().trim().max(16),
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

type VariantRow = {
  sizeId: string | null
  size: string
  colorName: string
  colorHex: string
  quantity: number
}

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
  subcategoryId: string
  variants: VariantRow[]
  isAvailable: boolean
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

const colorPickerUiValue = (stored: string): string => {
  const t = stored.trim()
  return HEX_COLOR_RE.test(t) ? t.toLowerCase() : '#000000'
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type LocalPickedFileRowProps = {
  file: File
  color: string
  onRemove: () => void
}

const LocalPickedFileRow = ({ file, color, onRemove }: LocalPickedFileRowProps): ReactElement => {
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
        <p className="mt-1 text-xs font-semibold text-indigo-700">{color || 'Unmapped color'}</p>
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

type SubcategorySelectProps = {
  categoryId: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}

const SubcategorySelect = ({
  categoryId,
  value,
  onChange,
  disabled,
}: SubcategorySelectProps): ReactElement => {
  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-subcategories', categoryId],
    queryFn: () => listProductSubcategoriesByCategory(categoryId),
    enabled: Boolean(categoryId.trim()),
  })
  const active = rows.filter((r) => r.isActive)
  const selectedInactive = rows.find((r) => r.id === value && !r.isActive)
  const hasCategory = Boolean(categoryId.trim())

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <select
          id="subcategoryId"
          name="subcategoryId"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isLoading || !hasCategory}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        >
          <option value="">{hasCategory ? 'None (optional)' : 'Select a category first'}</option>
          {active.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          {selectedInactive ? (
            <option key={selectedInactive.id} value={selectedInactive.id}>
              {selectedInactive.name} (inactive)
            </option>
          ) : null}
        </select>
        {hasCategory ? (
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetching ? '…' : 'Refresh'}
          </button>
        ) : null}
      </div>
      {hasCategory && !isLoading && active.length > 0 ? (
        <p className="text-xs text-slate-500">{active.length} subcategory option(s) for this category.</p>
      ) : null}
      {hasCategory && !isLoading && active.length === 0 ? (
        <p className="text-xs text-amber-700">
          No subcategories yet.{' '}
          <Link
            to={`/dashboard/product-categories/${categoryId.trim()}/edit`}
            className="font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Add subcategories on the category
          </Link>
        </p>
      ) : null}
    </div>
  )
}

// ─── Sortable Image Item ──────────────────────────────────────────────────────
type SortableImageProps = {
  img: { id: string; path: string; color?: string; sortOrder: number }
  onColorBlur: (imageId: string, color: string) => void
  onDelete: (imageId: string) => void
  deletePending: boolean
}

const SortableImage = ({ img, onColorBlur, onDelete, deletePending }: SortableImageProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="relative w-24 space-y-1">
      <div className="relative">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 z-10 cursor-grab rounded-bl-lg rounded-tr-lg bg-slate-900/60 p-0.5 text-white hover:bg-slate-900/80 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={12} />
        </button>
        <img
          src={productImageUrl(img.path)}
          alt=""
          className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
        />
        <button
          type="button"
          onClick={() => onDelete(img.id)}
          disabled={deletePending}
          className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow hover:bg-red-500 disabled:opacity-50"
        >
          ×
        </button>
      </div>
      <input
        type="text"
        defaultValue={img.color ?? ''}
        placeholder="Color name"
        className="w-24 rounded border border-slate-300 px-1.5 py-1 text-[10px] outline-none focus:border-indigo-500"
        onBlur={(e) => {
          const next = e.target.value.trim()
          if ((img.color ?? '') !== next) onColorBlur(img.id, next)
        }}
      />
    </div>
  )
}

type SortableImageGridProps = {
  images: { id: string; path: string; color?: string; sortOrder: number }[]
  onReorder: (order: { id: string; sortOrder: number }[]) => void
  onColorBlur: (imageId: string, color: string) => void
  onDelete: (imageId: string) => void
  deletePending: boolean
}

const SortableImageGrid = ({ images, onReorder, onColorBlur, onDelete, deletePending }: SortableImageGridProps) => {
  const [items, setItems] = useState(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Keep items in sync if images prop changes (e.g. after delete)
  useEffect(() => {
    setItems([...images].sort((a, b) => a.sortOrder - b.sortOrder))
  }, [images])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    onReorder(reordered.map((img, idx) => ({ id: img.id, sortOrder: idx })))
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">
        Current images <span className="text-xs font-normal text-slate-400">(drag to reorder — first image is thumbnail)</span>
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-3">
            {items.map((img) => (
              <SortableImage
                key={img.id}
                img={img}
                onColorBlur={onColorBlur}
                onDelete={onDelete}
                deletePending={deletePending}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

const ProductForm = (): ReactElement => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id: productId } = useParams<{ id: string }>()
  const isCreate = Boolean(useMatch('/dashboard/products/new'))

  const [newFiles, setNewFiles] = useState<Array<{ file: File; color: string }>>([])
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
    (a, b) => a.name.localeCompare(b.name),
  )

  const sortedFabrics = [...fabrics].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )

  const { data: measurementAttrs = [], isLoading: measurementAttrsLoading } = useQuery({
    queryKey: ['admin-measurement-attributes'],
    queryFn: listMeasurementAttributes,
  })
  const { data: settings } = useQuery({
    queryKey: ['basic-settings'],
    queryFn: getBasicSettings,
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

  const reorderImagesMutation = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => {
      if (!productId) throw new Error('Invalid product')
      return reorderProductImages(productId, order)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Reorder failed'),
  })

  const updateImageColorMutation = useMutation({
    mutationFn: ({ imageId, color }: { imageId: string; color: string }) => {
      if (!productId) throw new Error('Invalid product')
      return updateProductImageColor(productId, imageId, color)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
      toast.success('Image color updated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Image color update failed'),
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
        subcategoryId: '',
        variants: [{ sizeId: null, size: '', colorName: '', colorHex: '#000000', quantity: 0 }],
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
        color: '',
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
        subcategoryId: existing?.subcategory?.id ?? '',
        variants:
          existing?.variants?.length && existing.variants.length > 0
            ? existing.variants.map((v) => ({
                sizeId: v.sizeId ?? null,
                size: v.size,
                colorName: v.color || existing?.color || '',
                colorHex: '#000000',
                quantity: v.quantity,
              }))
            : [{ sizeId: null, size: 'One size', colorName: existing?.color || '', colorHex: '#000000', quantity: existing?.quantity ?? 0 }],
        isAvailable: existing?.isAvailable ?? true,
      }

  const handleSubmit = async (values: FormValues) => {
    const variantPayload = values.variants.map((v) => {
      const row: { size: string; color: string; quantity: number; sizeId?: string } = {
        size: v.size.trim(),
        color: v.colorName.trim(),
        quantity: Math.max(0, Math.floor(Number(v.quantity))),
      }
      const sid = v.sizeId?.trim()
      if (sid) row.sizeId = sid
      return row
    })
    const normalizedProductColor = variantPayload[0]?.color ?? ''
    const totalQty = sumVariantQty(variantPayload)
    const activeColors = new Set(
      variantPayload.map((variant) => variant.color.trim().toLowerCase()).filter((color) => color.length > 0),
    )
    const mappedFiles = newFiles.filter((item) =>
      activeColors.has(item.color.trim().toLowerCase()),
    )

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
      fd.append('color', normalizedProductColor)
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
      const sid = values.subcategoryId.trim()
      if (sid && cid) {
        fd.append('subcategoryId', sid)
      }
      mappedFiles.forEach((item) => fd.append('images', item.file))
      fd.append('imageColors', JSON.stringify(mappedFiles.map((item) => item.color.trim())))
      await createMutation.mutateAsync(fd)
      return
    }

    if (!productId) return

    const payload: UpdateProductPayload = {
      name: values.name.trim(),
      description: values.description.trim(),
      price: values.price,
      audience: values.audience,
      color: normalizedProductColor || null,
      fabrics: fabricPayload,
      measurementAttributeIds: values.measurementAttributeIds,
      categoryId: values.categoryId.trim() || null,
      subcategoryId: values.categoryId.trim() && values.subcategoryId.trim() ? values.subcategoryId.trim() : null,
      isAvailable: values.isAvailable,
      discountPercent:
        values.discountPercent >= 1
          ? Math.min(100, Math.floor(values.discountPercent))
          : null,
      variants: variantPayload,
    }

    await updateMutation.mutateAsync({ id: productId, payload })

    if (mappedFiles.length > 0) {
      const fd = new FormData()
      mappedFiles.forEach((item) => fd.append('images', item.file))
      fd.append('imageColors', JSON.stringify(mappedFiles.map((item) => item.color.trim())))
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
        {({ values, handleChange, handleBlur, isSubmitting, dirty, isValid, setFieldValue, errors }) => {
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
          const variantColors = Array.from(
            new Set(
              values.variants
                .map((variant) => variant.colorName.trim())
                .filter((color) => color.length > 0),
            ),
          )

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
                  Category <span className="text-red-600">*</span>
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={values.categoryId}
                  onChange={(e) => {
                    setFieldValue('categoryId', e.target.value)
                    setFieldValue('subcategoryId', '')
                  }}
                  onBlur={handleBlur}
                  disabled={categoriesLoading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                >
                  <option value="">Select category</option>
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
                  {values.categoryId.trim() ? (
                    <Link
                      to={`/dashboard/product-categories/${values.categoryId.trim()}/subcategories`}
                      className="font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Manage subcategories
                    </Link>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-red-600">
                  <ErrorMessage name="categoryId" />
                </p>
              </div>

              <div>
                <label htmlFor="subcategoryId" className="mb-1 block text-sm font-medium text-slate-700">
                  Subcategory (optional)
                </label>
                <SubcategorySelect
                  categoryId={values.categoryId}
                  value={values.subcategoryId}
                  onChange={(next) => setFieldValue('subcategoryId', next)}
                  disabled={categoriesLoading}
                />
                <p className="mt-1 text-xs text-slate-500">Pick a type under this category.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="price" className="mb-1 block text-sm font-medium text-slate-700">
                    Price (₹)
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
                          ₹{Number(values.price).toFixed(2)}
                        </span>
                        <span className="ml-2 font-semibold text-emerald-700">
                          ₹{(
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

              <div>
                <div>
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
                  {typeof errors.fabrics === 'string' && (
                    <p className="mt-1 text-xs text-red-600">{errors.fabrics}</p>
                  )}
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
                    <p className="text-sm font-medium text-slate-700">Variants (size, color &amp; stock)</p>
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
                          <div className="min-w-[160px] flex-1">
                            <label
                              className="mb-0.5 block text-xs font-medium text-slate-600"
                              htmlFor={`variants.${idx}.colorName`}
                            >
                              Color name
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                aria-label={`Pick color for variant row ${idx + 1}`}
                                title="Pick variant color"
                                className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                                value={colorPickerUiValue(values.variants[idx]?.colorHex ?? '')}
                                onChange={(e) => setFieldValue(`variants.${idx}.colorHex`, e.target.value)}
                              />
                              <Field
                                id={`variants.${idx}.colorName`}
                                name={`variants.${idx}.colorName`}
                                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                                placeholder="Black, Navy, White..."
                              />
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">Use color name. Picker is optional for swatch.</p>
                            <p className="mt-0.5 text-xs text-red-600">
                              <ErrorMessage name={`variants.${idx}.colorName`} />
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
                          <div className="w-full rounded-lg border border-dashed border-slate-300 bg-white/80 p-2">
                            <p className="mb-1 text-xs font-medium text-slate-700">
                              Images for {values.variants[idx]?.colorName?.trim() || 'this color'}
                            </p>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              multiple
                              onChange={(event) => {
                                const variantColor = values.variants[idx]?.colorName?.trim()
                                if (!variantColor) {
                                  toast.warn('Enter variant color name first, then add images.')
                                  event.target.value = ''
                                  return
                                }
                                const picked = Array.from(event.target.files ?? [])
                                if (!picked.length) return
                                const maxBytes = settings?.uploads.limits.productImageMaxBytes ?? 1 * 1024 * 1024
                                const allowed = new Set(settings?.uploads.image.mimeTypes ?? [
                                  'image/jpeg',
                                  'image/jpg',
                                  'image/png',
                                  'image/gif',
                                  'image/webp',
                                ])
                                const badType = picked.find((file) => !allowed.has(file.type))
                                if (badType) {
                                  toast.error('Only JPEG, PNG, GIF, or WebP images are allowed')
                                  event.target.value = ''
                                  return
                                }
                                const tooLarge = picked.find((file) => file.size > maxBytes)
                                if (tooLarge) {
                                  toast.error(`Each product image must be <= ${(maxBytes / (1024 * 1024)).toFixed(0)} MB`)
                                  event.target.value = ''
                                  return
                                }
                                setNewFiles((prev) => {
                                  const merged = [...prev, ...picked.map((file) => ({ file, color: variantColor }))]
                                  const seen = new Set<string>()
                                  return merged.filter((item) => {
                                    const key = `${item.file.name}-${item.file.size}-${item.file.lastModified}-${item.color.toLowerCase()}`
                                    if (seen.has(key)) return false
                                    seen.add(key)
                                    return true
                                  })
                                })
                                event.target.value = ''
                              }}
                              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                            />
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
                        onClick={() => push({ sizeId: null, size: '', colorName: '', colorHex: '#000000', quantity: 0 })}
                        className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add size row
                      </button>
                      {typeof errors.variants === 'string' && (
                        <p className="text-xs text-red-600">{errors.variants}</p>
                      )}
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
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Images by variant color
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Add images under each variant color. User panel will switch images when that color is selected.
                </p>
                {variantColors.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Add at least one variant color to enable color-wise image upload.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {variantColors.map((color) => {
                      const colorFiles = newFiles.filter((item) => item.color.trim().toLowerCase() === color.toLowerCase())
                      return (
                        <div key={color} className="rounded-xl border border-slate-200 p-3">
                          <p className="mb-2 text-sm font-semibold text-slate-800">{color}</p>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            multiple
                            onChange={(event) => {
                              const picked = Array.from(event.target.files ?? [])
                              if (!picked.length) return
                              const maxBytes = settings?.uploads.limits.productImageMaxBytes ?? 1 * 1024 * 1024
                              const allowed = new Set(settings?.uploads.image.mimeTypes ?? [
                                'image/jpeg',
                                'image/jpg',
                                'image/png',
                                'image/gif',
                                'image/webp',
                              ])
                              const badType = picked.find((file) => !allowed.has(file.type))
                              if (badType) {
                                toast.error('Only JPEG, PNG, GIF, or WebP images are allowed')
                                event.target.value = ''
                                return
                              }
                              const tooLarge = picked.find((file) => file.size > maxBytes)
                              if (tooLarge) {
                                toast.error(`Each product image must be <= ${(maxBytes / (1024 * 1024)).toFixed(0)} MB`)
                                event.target.value = ''
                                return
                              }
                              setNewFiles((prev) => {
                                const merged = [...prev, ...picked.map((file) => ({ file, color }))]
                                const seen = new Set<string>()
                                return merged.filter((item) => {
                                  const key = `${item.file.name}-${item.file.size}-${item.file.lastModified}-${item.color.toLowerCase()}`
                                  if (seen.has(key)) return false
                                  seen.add(key)
                                  return true
                                })
                              })
                              event.target.value = ''
                            }}
                            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                          />
                          {colorFiles.length > 0 ? (
                            <ul className="mt-3 space-y-2">
                              {colorFiles.map((item) => (
                                <li key={`${item.file.name}-${item.file.size}-${item.file.lastModified}-${item.color}`}>
                                  <LocalPickedFileRow
                                    file={item.file}
                                    color={item.color}
                                    onRemove={() => {
                                      setNewFiles((prev) => prev.filter((entry) => entry !== item))
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-slate-400">No images selected for {color}.</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {!isCreate && existing?.images?.length ? (
                <SortableImageGrid
                  images={existing.images}
                  onReorder={(newOrder) => reorderImagesMutation.mutate(newOrder)}
                  onColorBlur={(imageId, color) => updateImageColorMutation.mutate({ imageId, color })}
                  onDelete={(imageId) => setImageToDelete(imageId)}
                  deletePending={deleteImageMutation.isPending}
                />
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
