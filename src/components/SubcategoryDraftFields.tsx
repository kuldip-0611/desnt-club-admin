import type { ReactElement } from 'react'
import { slugify } from '../utils/slugify'
export type SubcategoryDraft = {
  name: string
  slug: string
  sortOrder: number
  imageFile: File | null
  imagePreview?: string
}

type SubcategoryDraftFieldsProps = {
  rows: SubcategoryDraft[]
  onChange: (rows: SubcategoryDraft[]) => void
}

const emptyRow = (sortOrder: number): SubcategoryDraft => ({
  name: '',
  slug: '',
  sortOrder,
  imageFile: null,
})

export const SubcategoryDraftFields = ({ rows, onChange }: SubcategoryDraftFieldsProps): ReactElement => {
  const updateRow = (index: number, patch: Partial<SubcategoryDraft>): void => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  const addRow = (): void => {
    onChange([...rows, emptyRow(rows.length)])
  }

  const removeRow = (index: number): void => {
    const row = rows[index]
    if (row.imagePreview) {
      URL.revokeObjectURL(row.imagePreview)
    }
    if (rows.length <= 1) {
      onChange([emptyRow(0)])
      return
    }
    onChange(rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, sortOrder: i })))
  }

  const handleImageChange = (index: number, file: File | null): void => {
    const row = rows[index]
    if (row.imagePreview) {
      URL.revokeObjectURL(row.imagePreview)
    }
    if (!file) {
      updateRow(index, { imageFile: null, imagePreview: undefined })
      return
    }
    updateRow(index, {
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    })
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={`sub-draft-${index}`}
          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Subcategory name <span className="text-red-600">*</span>
            </label>
            <input
              value={row.name}
              onChange={(e) => {
                const name = e.target.value
                const patch: Partial<SubcategoryDraft> = { name }
                if (!row.slug.trim()) {
                  patch.slug = slugify(name)
                }
                updateRow(index, patch)
              }}
              placeholder="Round neck"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Slug <span className="text-red-600">*</span>
            </label>
            <input
              value={row.slug}
              onChange={(e) => updateRow(index, { slug: e.target.value })}
              placeholder="round-neck"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Image <span className="text-red-600">*</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => handleImageChange(index, e.target.files?.[0] ?? null)}
              className="w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700"
            />
            {row.imagePreview ? (
              <img
                src={row.imagePreview}
                alt=""
                className="mt-2 h-14 w-14 rounded-lg border border-slate-200 object-cover"
              />
            ) : null}
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-white hover:text-red-500"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border border-dashed border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
      >
        + Add another subcategory
      </button>
    </div>
  )
}
