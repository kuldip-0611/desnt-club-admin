import type { ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Field, Form, Formik, ErrorMessage } from 'formik'
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import { createCoupon, getCoupon, updateCoupon } from '../services/coupons'
import type {
  CouponDiscountType,
  CreateCouponPayload,
  UpdateCouponPayload,
} from '../types/coupon'

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fromDatetimeLocal = (s: string): string | undefined => {
  const t = s.trim()
  if (!t) return undefined
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

const emptyToUndef = (value: unknown, originalValue: unknown) =>
  originalValue === '' ? undefined : value

const couponSchema = Yup.object({
  code: Yup.string().trim().required('Code is required').min(3).max(40),
  discountType: Yup.mixed<CouponDiscountType>().oneOf(['PERCENT', 'FIXED']).required(),
  value: Yup.number()
    .typeError('Enter a valid amount')
    .min(0, 'Min 0')
    .required('Required')
    .when('discountType', {
      is: 'PERCENT',
      then: (schema) => schema.max(100, 'Percent cannot exceed 100'),
      otherwise: (schema) => schema,
    }),
  minSubtotal: Yup.number()
    .transform(emptyToUndef)
    .typeError('Invalid')
    .min(0, 'Min 0')
    .optional(),
  maxDiscount: Yup.number()
    .transform(emptyToUndef)
    .typeError('Invalid')
    .min(0, 'Min 0')
    .optional(),
  usageLimit: Yup.number()
    .transform(emptyToUndef)
    .typeError('Invalid')
    .integer('Whole number')
    .min(1, 'Min 1')
    .optional(),
  startsAt: Yup.string(),
  endsAt: Yup.string(),
  isActive: Yup.boolean().required(),
})

type FormValues = {
  code: string
  discountType: CouponDiscountType
  value: number
  minSubtotal: number | ''
  maxDiscount: number | ''
  usageLimit: number | ''
  startsAt: string
  endsAt: string
  isActive: boolean
}

const CouponForm = (): ReactElement => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id: couponId } = useParams<{ id: string }>()
  const isCreate = Boolean(useMatch('/dashboard/coupons/new'))

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-coupon', couponId],
    queryFn: () => getCoupon(couponId!),
    enabled: !isCreate && Boolean(couponId),
  })

  const createMutation = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon created')
      navigate('/dashboard/coupons')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Create failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCouponPayload }) =>
      updateCoupon(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      queryClient.invalidateQueries({ queryKey: ['admin-coupon', couponId] })
      toast.success('Coupon saved')
      navigate('/dashboard/coupons')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  if (!isCreate && isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  const initialValues: FormValues = existing
    ? {
        code: existing.code,
        discountType: existing.discountType,
        value: Number(existing.value),
        minSubtotal: existing.minSubtotal != null ? Number(existing.minSubtotal) : '',
        maxDiscount: existing.maxDiscount != null ? Number(existing.maxDiscount) : '',
        usageLimit: existing.usageLimit ?? '',
        startsAt: toDatetimeLocal(existing.startsAt),
        endsAt: toDatetimeLocal(existing.endsAt),
        isActive: existing.isActive,
      }
    : {
        code: '',
        discountType: 'PERCENT',
        value: 10,
        minSubtotal: '',
        maxDiscount: '',
        usageLimit: '',
        startsAt: '',
        endsAt: '',
        isActive: true,
      }

  const toCreatePayload = (values: FormValues): CreateCouponPayload => {
    const numOrUndef = (v: number | '' | undefined) =>
      v === '' || v === undefined ? undefined : Number(v)
    return {
      code: values.code.trim(),
      discountType: values.discountType,
      value: values.value,
      minSubtotal: numOrUndef(values.minSubtotal),
      maxDiscount:
        values.discountType === 'PERCENT' ? numOrUndef(values.maxDiscount) : undefined,
      usageLimit: numOrUndef(values.usageLimit),
      startsAt: values.startsAt.trim() === '' ? undefined : fromDatetimeLocal(values.startsAt),
      endsAt: values.endsAt.trim() === '' ? undefined : fromDatetimeLocal(values.endsAt),
      isActive: values.isActive,
    }
  }

  const toUpdatePayload = (values: FormValues): UpdateCouponPayload => {
    const numOrNull = (v: number | '' | undefined) =>
      v === '' || v === undefined ? null : Number(v)
    return {
      code: values.code.trim(),
      discountType: values.discountType,
      value: values.value,
      minSubtotal: numOrNull(values.minSubtotal),
      maxDiscount:
        values.discountType === 'PERCENT' ? numOrNull(values.maxDiscount) : null,
      usageLimit: numOrNull(values.usageLimit),
      startsAt: values.startsAt.trim() === '' ? null : fromDatetimeLocal(values.startsAt),
      endsAt: values.endsAt.trim() === '' ? null : fromDatetimeLocal(values.endsAt),
      isActive: values.isActive,
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to="/dashboard/coupons"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          ← Back to coupons
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {isCreate ? 'New coupon' : 'Edit coupon'}
        </h1>
      </div>

      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={couponSchema}
        onSubmit={(values) => {
          if (isCreate) {
            createMutation.mutate(toCreatePayload(values))
          } else if (couponId) {
            updateMutation.mutate({ id: couponId, payload: toUpdatePayload(values) })
          }
        }}
      >
        {({ values, isSubmitting }) => (
          <Form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-700">
                Code
              </label>
              <Field
                id="code"
                name="code"
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <ErrorMessage name="code" component="p" className="mt-1 text-sm text-red-600" />
            </div>

            <div>
              <label htmlFor="discountType" className="block text-sm font-medium text-slate-700">
                Discount type
              </label>
              <Field
                id="discountType"
                name="discountType"
                as="select"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="PERCENT">Percent off</option>
                <option value="FIXED">Fixed amount off</option>
              </Field>
            </div>

            <div>
              <label htmlFor="value" className="block text-sm font-medium text-slate-700">
                {values.discountType === 'PERCENT' ? 'Percent (0–100)' : 'Amount ($)'}
              </label>
              <Field
                id="value"
                name="value"
                type="number"
                step={values.discountType === 'PERCENT' ? '1' : '0.01'}
                min={0}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <ErrorMessage name="value" component="p" className="mt-1 text-sm text-red-600" />
            </div>

            <div>
              <label htmlFor="minSubtotal" className="block text-sm font-medium text-slate-700">
                Minimum order subtotal (optional)
              </label>
              <Field
                id="minSubtotal"
                name="minSubtotal"
                type="number"
                step="0.01"
                min={0}
                placeholder="No minimum"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {values.discountType === 'PERCENT' ? (
              <div>
                <label htmlFor="maxDiscount" className="block text-sm font-medium text-slate-700">
                  Max discount cap ($, optional)
                </label>
                <Field
                  id="maxDiscount"
                  name="maxDiscount"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="No cap"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="usageLimit" className="block text-sm font-medium text-slate-700">
                Total redemptions allowed (optional)
              </label>
              <Field
                id="usageLimit"
                name="usageLimit"
                type="number"
                min={1}
                placeholder="Unlimited"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startsAt" className="block text-sm font-medium text-slate-700">
                  Starts (optional)
                </label>
                <Field
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label htmlFor="endsAt" className="block text-sm font-medium text-slate-700">
                  Ends (optional)
                </label>
                <Field
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Field
                id="isActive"
                name="isActive"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                Active
              </label>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={
                  isSubmitting || createMutation.isPending || updateMutation.isPending
                }
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-60"
              >
                {isCreate ? 'Create coupon' : 'Save changes'}
              </button>
              <Link
                to="/dashboard/coupons"
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default CouponForm
