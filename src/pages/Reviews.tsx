import type { ReactElement } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Star } from 'lucide-react'
import api from '../services/api'

type Review = {
  id: string
  rating: number
  comment: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  user: { id: string; name: string; email: string }
  product: { id: string; name: string; slug: string }
}

type ReviewsResponse = {
  items: Review[]
  total: number
  page: number
  totalPages: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const StarDisplay = ({ rating }: { rating: number }) => (
  <span className="text-amber-400">
    {'★'.repeat(rating)}
    <span className="text-slate-200">{'★'.repeat(5 - rating)}</span>
  </span>
)

const Reviews = (): ReactElement => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<ReviewsResponse>({
    queryKey: ['admin-reviews', statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (statusFilter !== 'ALL') params.status = statusFilter
      const { data } = await api.get<ReviewsResponse>('/admin/reviews', { params })
      return data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      await api.patch(`/admin/reviews/${id}`, { status })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
  })

  const reviews = data?.items ?? []

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading reviews…</div>
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Could not load reviews. Check admin auth and backend API.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Product Reviews</h1>
        <p className="mt-1 text-sm text-slate-600">
          Moderate customer reviews before they appear on the storefront.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <span className="ml-auto flex items-center text-sm text-slate-500">
          {data?.total ?? 0} reviews
        </span>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No reviews to show.
        </p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Rating</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Review</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{review.user.name}</p>
                    <p className="text-xs text-slate-500">{review.user.email}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    <p className="truncate font-medium text-slate-800">{review.product.name}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StarDisplay rating={review.rating} />
                    <span className="ml-1 text-xs text-slate-500">{review.rating}/5</span>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    {review.comment ? (
                      <p className="line-clamp-2 text-slate-700">{review.comment}</p>
                    ) : (
                      <span className="italic text-slate-400">No comment</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[review.status] ?? ''}`}>
                      {review.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {review.status !== 'APPROVED' && (
                        <button
                          type="button"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: review.id, status: 'APPROVED' })}
                          className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
                        >
                          <CheckCircle size={12} /> Approve
                        </button>
                      )}
                      {review.status !== 'REJECTED' && (
                        <button
                          type="button"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: review.id, status: 'REJECTED' })}
                          className="flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="text-slate-600">
            Page {data?.page ?? 1} of {data?.totalPages ?? 1} · {data?.total ?? 0} reviews
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (data?.totalPages ?? 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reviews
