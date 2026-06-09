import type { FormEvent, ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import AccountsSubNav from '../components/AccountsSubNav'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { listCoupons } from '../services/coupons'
import {
  addUserToGroup,
  assignCouponToGroup,
  createUserGroup,
  deleteUserGroup,
  getUserGroup,
  listUserGroups,
  removeUserFromGroup,
  unassignCouponFromGroup,
  updateUserGroup,
} from '../services/userGroups'
import { listUsers } from '../services/users'
import type { UserGroupSummary } from '../types/userGroup'

const UserGroups = (): ReactElement => {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [memberUserId, setMemberUserId] = useState('')
  const [couponId, setCouponId] = useState('')
  const [groupToDelete, setGroupToDelete] = useState<UserGroupSummary | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['admin-user-groups'],
    queryFn: listUserGroups,
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user-group', selectedId],
    queryFn: () => getUserGroup(selectedId!),
    enabled: Boolean(selectedId),
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-picker'],
    queryFn: () => listUsers({ limit: 100 }),
  })

  const { data: coupons = [] } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: listCoupons,
  })

  const invalidate = (): void => {
    queryClient.invalidateQueries({ queryKey: ['admin-user-groups'] })
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: ['admin-user-group', selectedId] })
    }
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createUserGroup({
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (g) => {
      setShowCreate(false)
      setName('')
      setDescription('')
      setSelectedId(g.id)
      invalidate()
      toast.success('Group created')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Create failed'),
  })

  const addMemberMutation = useMutation({
    mutationFn: () => addUserToGroup(selectedId!, memberUserId),
    onSuccess: () => {
      setMemberUserId('')
      invalidate()
      toast.success('Member added')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Add member failed'),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeUserFromGroup(selectedId!, userId),
    onSuccess: () => {
      invalidate()
      toast.success('Member removed')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Remove failed'),
  })

  const assignCouponMutation = useMutation({
    mutationFn: () => assignCouponToGroup(selectedId!, couponId),
    onSuccess: () => {
      setCouponId('')
      invalidate()
      toast.success('Coupon assigned to group')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Assign failed'),
  })

  const unassignCouponMutation = useMutation({
    mutationFn: (cid: string) => unassignCouponFromGroup(selectedId!, cid),
    onSuccess: () => {
      invalidate()
      toast.success('Coupon removed from group')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Remove failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUserGroup,
    onSuccess: () => {
      setGroupToDelete(null)
      setSelectedId(null)
      invalidate()
      toast.success('Group deleted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUserGroup(id, { isActive }),
    onSuccess: () => {
      invalidate()
      toast.success('Group updated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const handleCreate = (e: FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Group name is required')
      return
    }
    createMutation.mutate()
  }

  const userOptions = usersData?.items ?? []

  return (
    <div className="space-y-6">
      <AccountsSubNav />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User groups</h1>
          <p className="mt-1 text-sm text-slate-600">
            Group users and assign coupons — members inherit group coupons on the Users page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {showCreate ? 'Cancel' : 'New group'}
        </button>
      </div>

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Create group</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="VIP customers"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Create group
          </button>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <h2 className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Groups
          </h2>
          {isLoading ? (
            <p className="p-3 text-sm text-slate-500">Loading…</p>
          ) : groups.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">No groups yet</p>
          ) : (
            <ul className="space-y-1">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(g.id)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      selectedId === g.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-semibold">{g.name}</span>
                    <span
                      className={`mt-0.5 block text-xs ${
                        selectedId === g.id ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      {g._count.members} members · {g._count.couponLinks} coupons
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!selectedId ? (
            <p className="text-sm text-slate-500">Select a group to manage members and coupons</p>
          ) : detailLoading || !detail ? (
            <p className="text-sm text-slate-500">Loading group…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{detail.name}</h2>
                  {detail.description ? (
                    <p className="mt-1 text-sm text-slate-600">{detail.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: detail.id,
                        isActive: !detail.isActive,
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      detail.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {detail.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGroupToDelete({
                        id: detail.id,
                        name: detail.name,
                        description: detail.description,
                        isActive: detail.isActive,
                        createdAt: detail.createdAt,
                        updatedAt: detail.updatedAt,
                        _count: {
                          members: detail.members.length,
                          couponLinks: detail.couponLinks.length,
                        },
                      })
                    }
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete group
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Members</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    value={memberUserId}
                    onChange={(e) => setMemberUserId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Add user…</option>
                    {userOptions
                      .filter((u) => !detail.members.some((m) => m.userId === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email ?? u.phone ?? u.id.slice(0, 8)})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!memberUserId || addMemberMutation.isPending}
                    onClick={() => addMemberMutation.mutate()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                <ul className="mt-3 space-y-2">
                  {detail.members.length === 0 ? (
                    <li className="text-sm text-slate-500">No members</li>
                  ) : (
                    detail.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-slate-900">
                          {m.user.name}
                          <span className="ml-2 text-xs text-slate-500">
                            {m.user.email ?? m.user.phone}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMemberMutation.mutate(m.userId)}
                          className="text-xs font-semibold text-red-600"
                        >
                          Remove
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Group coupons</h3>
                <p className="text-xs text-slate-500">
                  All members can use these codes (shown on their user card)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    value={couponId}
                    onChange={(e) => setCouponId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Assign coupon…</option>
                    {coupons
                      .filter(
                        (c) =>
                          c.isActive &&
                          !detail.couponLinks.some((link) => link.couponId === c.id),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!couponId || assignCouponMutation.isPending}
                    onClick={() => assignCouponMutation.mutate()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {detail.couponLinks.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5"
                    >
                      <span className="font-mono text-sm font-semibold text-indigo-900">
                        {link.coupon.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => unassignCouponMutation.mutate(link.couponId)}
                        className="text-xs text-red-600"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(groupToDelete)}
        title="Delete user group?"
        message={`Remove "${groupToDelete?.name}"? Members keep their accounts; only the group is deleted.`}
        onClose={() => setGroupToDelete(null)}
        onConfirm={() => groupToDelete && deleteMutation.mutate(groupToDelete.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

export default UserGroups
