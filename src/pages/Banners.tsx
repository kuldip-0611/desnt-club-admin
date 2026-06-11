import type { ReactElement, FormEvent, ChangeEvent } from 'react'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Plus, Pencil, Trash2, X, UploadCloud, Image as ImageIcon } from 'lucide-react'
import baseUrl from '../config'
import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  type Banner,
} from '../services/banners'

type Position = 'hero' | 'mid' | 'footer'
const POSITIONS: Position[] = ['hero', 'mid', 'footer']

const emptyForm = (): Partial<Banner> => ({
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  position: 'hero',
  isActive: true,
  sortOrder: 0,
  startsAt: '',
  endsAt: '',
})

/** Resolve a banner imageUrl to a displayable src */
function resolveImageSrc(url: string | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`
}

// ── BannerModal ────────────────────────────────────────────────────────────────

const BannerModal = ({
  banner,
  onClose,
}: {
  banner: Partial<Banner> | null
  onClose: () => void
}): ReactElement => {
  const queryClient = useQueryClient()
  const isEdit = !!banner?.id
  const [form, setForm] = useState<Partial<Banner>>(banner ?? emptyForm())
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(
    resolveImageSrc(banner?.imageUrl)
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof Banner, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    // Clear any existing imageUrl since we have a file now
    set('imageUrl', '')
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please drop an image file')
      return
    }
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    set('imageUrl', '')
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateBanner(form.id!, form, imageFile ?? undefined)
        : createBanner(form, imageFile ?? undefined),
    onSuccess: () => {
      toast.success(isEdit ? 'Banner updated' : 'Banner created')
      void queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      onClose()
    },
    onError: () => toast.error('Failed to save banner'),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!imageFile && !previewUrl) {
      toast.error('Please upload a banner image')
      return
    }
    saveMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit Banner' : 'New Banner'}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Image upload area ── */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Banner Image <span className="text-red-400">*</span>
            </label>
            <div
              className={`relative cursor-pointer rounded-xl border-2 border-dashed transition ${
                previewUrl
                  ? 'border-indigo-500/40 bg-slate-900/50'
                  : 'border-white/10 bg-slate-900 hover:border-indigo-500/50 hover:bg-slate-800/60'
              }`}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: 200 }}
                  />
                  {/* Change image overlay */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition hover:opacity-100">
                    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                      <UploadCloud size={14} /> Change image
                    </div>
                  </div>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setImageFile(null)
                      setPreviewUrl('')
                      set('imageUrl', '')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-1 text-slate-300 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
                  <UploadCloud size={32} className="text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">Click or drag & drop to upload</p>
                  <p className="text-xs">JPEG, PNG, WebP — max 5 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            {/* Show filename if a file is selected */}
            {imageFile && (
              <p className="mt-1.5 text-[10px] text-slate-500">
                Selected: <span className="text-slate-400">{imageFile.name}</span> ({(imageFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {/* ── Fields ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Title <span className="text-red-400">*</span></label>
              <input
                required
                value={form.title ?? ''}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Summer Sale — Up to 50% Off"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Subtitle</label>
              <input
                value={form.subtitle ?? ''}
                onChange={e => set('subtitle', e.target.value)}
                placeholder="e.g. Exclusive offers on premium styles"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Link URL <span className="text-slate-600">(optional)</span></label>
              <input
                value={form.linkUrl ?? ''}
                onChange={e => set('linkUrl', e.target.value)}
                placeholder="https://desentclub.com/products?category=sale"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Position</label>
              <select
                value={form.position ?? 'hero'}
                onChange={e => set('position', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {POSITIONS.map(p => (
                  <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Sort Order</label>
              <input
                type="number"
                min={0}
                value={form.sortOrder ?? 0}
                onChange={e => set('sortOrder', parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Starts At <span className="text-slate-600">(optional)</span></label>
              <input
                type="datetime-local"
                value={form.startsAt?.slice(0, 16) ?? ''}
                onChange={e => set('startsAt', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Ends At <span className="text-slate-600">(optional)</span></label>
              <input
                type="datetime-local"
                value={form.endsAt?.slice(0, 16) ?? ''}
                onChange={e => set('endsAt', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={e => set('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-slate-900 accent-indigo-600"
              />
              <label htmlFor="isActive" className="text-sm text-slate-300">Active (visible on site)</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Banners page ─────────────────────────────────────────────────────────

const Banners = (): ReactElement => {
  const queryClient = useQueryClient()
  const [activePos, setActivePos] = useState<Position>('hero')
  const [modal, setModal] = useState<Partial<Banner> | null | false>(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: listBanners,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateBanner(id, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
    },
    onError: () => toast.error('Failed to toggle banner'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      toast.success('Banner deleted')
      setDeleteId(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
    },
    onError: () => toast.error('Failed to delete banner'),
  })

  const filtered = banners.filter(b => b.position === activePos)

  return (
    <div className="space-y-6">
      {/* Modal */}
      {modal !== false && (
        <BannerModal banner={modal} onClose={() => setModal(false)} />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl max-w-sm w-full">
            <h3 className="mb-2 text-base font-semibold text-white">Delete Banner?</h3>
            <p className="mb-5 text-sm text-slate-400">The image file will also be removed. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Banners</h1>
          <p className="mt-1 text-sm text-slate-400">Upload and manage hero, mid-page, and footer banners.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal(emptyForm())}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus size={16} /> New Banner
        </button>
      </div>

      {/* Position tabs */}
      <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
        {POSITIONS.map(p => (
          <button
            key={p}
            onClick={() => setActivePos(p)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              activePos === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p} {banners.filter(b => b.position === p).length > 0 && (
              <span className="ml-1 text-xs opacity-60">({banners.filter(b => b.position === p).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-sm">Loading banners…</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed border-white/10 py-20 text-center text-slate-500 cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/5 transition"
          onClick={() => setModal({ ...emptyForm(), position: activePos })}
        >
          <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No {activePos} banners yet</p>
          <p className="mt-1 text-xs text-slate-600">Click to create the first one</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(b => (
              <div key={b.id} className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col">
                {/* Image preview */}
                <div className="relative aspect-video bg-slate-800 overflow-hidden">
                  {b.imageUrl ? (
                    <img
                      src={resolveImageSrc(b.imageUrl)}
                      alt={b.title}
                      className="w-full h-full object-cover transition group-hover:scale-105"
                      onError={e => { (e.target as HTMLImageElement).src = '' }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon size={32} className="text-slate-600" />
                    </div>
                  )}
                  {/* Overlay actions on hover */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setModal(b)}
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/20"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(b.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 backdrop-blur-sm hover:bg-red-500/50"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 truncate">{b.title}</p>
                      {b.subtitle && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{b.subtitle}</p>}
                    </div>
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ id: b.id, isActive: !b.isActive })}
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition ${
                        b.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-700/40 text-slate-500 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                    <span>Sort: {b.sortOrder}</span>
                    {b.startsAt && <span>From {new Date(b.startsAt).toLocaleDateString('en-IN')}</span>}
                    {b.endsAt && <span>Until {new Date(b.endsAt).toLocaleDateString('en-IN')}</span>}
                    {b.linkUrl && (
                      <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline truncate max-w-[120px]">
                        {b.linkUrl}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default Banners
