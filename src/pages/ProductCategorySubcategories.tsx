import type { ReactElement } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CategorySubcategoriesManager } from '../components/CategorySubcategoriesManager'
import { getProductCategory } from '../services/productCategories'

const ProductCategorySubcategoriesPage = (): ReactElement => {
  const { categoryId } = useParams<{ categoryId: string }>()

  const { data: parent, isLoading, isError } = useQuery({
    queryKey: ['admin-product-category', categoryId],
    queryFn: () => getProductCategory(categoryId!),
    enabled: Boolean(categoryId),
  })

  if (!categoryId) {
    return <p className="text-sm text-red-600">Missing category.</p>
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (isError || !parent) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Could not load category.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{parent.name}</h1>
        </div>
        <Link
          to="/dashboard/product-categories"
          className="shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          ← All categories
        </Link>
      </div>

      <CategorySubcategoriesManager categoryId={categoryId} categoryName={parent.name} />
    </div>
  )
}

export default ProductCategorySubcategoriesPage
