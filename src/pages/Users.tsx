import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AccountsSubNav from '../components/AccountsSubNav'
import UserAdminCard from '../components/UserAdminCard'
import FilterBar from '../components/ui/FilterBar'
import KpiCard from '../components/ui/KpiCard'
import { useDebounce } from '../hooks/useDebounce'
import { listUsers } from '../services/users'

const Users = (): ReactElement => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 350)
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL')
  const [providerFilter, setProviderFilter] = useState<'ALL' | 'EMAIL' | 'GOOGLE' | 'PHONE'>('ALL')
  const [verifiedFilter, setVerifiedFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL')
  const pageSize = 12

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', page, pageSize, debouncedSearch, roleFilter, providerFilter, verifiedFilter],
    queryFn: () =>
      listUsers({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        provider: providerFilter === 'ALL' ? undefined : providerFilter,
        isVerified:
          verifiedFilter === 'ALL' ? undefined : verifiedFilter === 'VERIFIED',
      }),
  })

  const users = data?.items ?? []
  const summary = data?.summary ?? { total: 0, verified: 0, admins: 0 }

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading users…</div>
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Could not load users. Check admin auth and backend API.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AccountsSubNav />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Users</h1>
        <p className="mt-1 text-sm text-slate-600">
          Each card shows available coupons, lets you assign codes, and validate them for that user.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total users" value={summary.total} />
        <KpiCard label="Verified users" value={summary.verified} tone="success" />
        <KpiCard label="Admins" value={summary.admins} tone="warning" />
      </div>

      <FilterBar
        searchId="user-search"
        searchPlaceholder="Search by name, email, or phone…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as typeof roleFilter)
            setPage(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => {
            setProviderFilter(e.target.value as typeof providerFilter)
            setPage(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All providers</option>
          <option value="EMAIL">Email</option>
          <option value="GOOGLE">Google</option>
          <option value="PHONE">Phone</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => {
            setVerifiedFilter(e.target.value as typeof verifiedFilter)
            setPage(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All verification states</option>
          <option value="VERIFIED">Verified</option>
          <option value="UNVERIFIED">Unverified</option>
        </select>
      </div>

      {users.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {debouncedSearch ? `No users match "${debouncedSearch}".` : 'No users yet.'}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {users.map((u) => (
            <UserAdminCard key={u.id} user={u} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="text-slate-600">
          Page {data?.page ?? 1} of {data?.totalPages ?? 1} · {data?.total ?? 0} users
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data?.hasPrevPage}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.hasNextPage}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default Users
