import type { ReactElement } from 'react'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Settings, Percent, Store, Phone, Mail, DollarSign, Truck, Save, RefreshCw } from 'lucide-react'
import api from '../services/api'

interface StoreConfig {
  defaultGstRate: string
  storeName: string
  supportEmail: string
  supportPhone: string
  currency: string
  freeShippingThreshold: string
  shippingFee: string
  sellerName: string
  sellerAddress: string
  sellerCity: string
  sellerState: string
  sellerPincode: string
  sellerPhone: string
  customerCarePhone: string
  gstin: string
}

const DEFAULT_CONFIG: StoreConfig = {
  defaultGstRate: '18',
  storeName: 'Disent Club',
  supportEmail: '',
  supportPhone: '',
  currency: 'INR',
  freeShippingThreshold: '999',
  shippingFee: '99',
  sellerName: '',
  sellerAddress: '',
  sellerCity: '',
  sellerState: '',
  sellerPincode: '',
  sellerPhone: '',
  customerCarePhone: '',
  gstin: '',
}

const GST_RATES = [
  { label: '0% — Exempt', value: '0' },
  { label: '5% — Essential goods', value: '5' },
  { label: '12% — Standard goods', value: '12' },
  { label: '18% — Standard rate (most apparel)', value: '18' },
  { label: '28% — Luxury goods', value: '28' },
]

export default function StoreSettings(): ReactElement {
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get<Record<string, string>>('/settings/store')
      .then((r) => {
        setConfig((prev) => ({ ...prev, ...r.data }))
      })
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/settings/store', config)
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof StoreConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setConfig((prev) => ({ ...prev, [key]: e.target.value }))

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
          <Settings size={20} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Store Settings</h1>
          <p className="text-sm text-slate-500">Global configuration applied across the store</p>
        </div>
      </div>

      {/* Tax Settings */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <Percent size={16} className="text-indigo-400" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Tax (GST)</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Default GST Rate
            </label>
            <select
              value={config.defaultGstRate}
              onChange={set('defaultGstRate')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {GST_RATES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              This rate is applied store-wide for cart, checkout, and orders.
            </p>
          </div>
        </div>
      </section>

      {/* Store Info */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <Store size={16} className="text-indigo-400" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Store Info</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Store Name</label>
            <input
              type="text"
              value={config.storeName}
              onChange={set('storeName')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Disent Club"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Mail size={13} /> Support Email
              </label>
              <input
                type="email"
                value={config.supportEmail}
                onChange={set('supportEmail')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="support@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Phone size={13} /> Support Phone
              </label>
              <input
                type="tel"
                value={config.supportPhone}
                onChange={set('supportPhone')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Shipping & Currency */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <Truck size={16} className="text-indigo-400" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Shipping & Currency</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <DollarSign size={13} /> Currency
            </label>
            <select
              value={config.currency}
              onChange={set('currency')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Shipping Fee (₹)
              </label>
              <input
                type="number"
                min={0}
                value={config.shippingFee}
                onChange={set('shippingFee')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="99"
              />
              <p className="mt-1.5 text-xs text-slate-500">Charged when order is below the free shipping threshold</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Free Shipping Above (₹)
              </label>
              <input
                type="number"
                min={0}
                value={config.freeShippingThreshold}
                onChange={set('freeShippingThreshold')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="999"
              />
              <p className="mt-1.5 text-xs text-slate-500">Orders above this amount get free shipping. Set to 0 to always charge.</p>
            </div>
          </div>
          {/* Preview */}
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <span className="font-medium">Preview: </span>
            {parseFloat(config.freeShippingThreshold) > 0
              ? <>Orders under ₹{config.freeShippingThreshold} → <strong className="text-slate-800 dark:text-slate-200">₹{config.shippingFee} shipping</strong> · Orders ₹{config.freeShippingThreshold}+ → <strong className="text-emerald-600 dark:text-emerald-400">Free shipping</strong></>
              : <>All orders charge <strong className="text-slate-800 dark:text-slate-200">₹{config.shippingFee} shipping</strong></>
            }
          </div>
        </div>
      </section>

      {/* Seller / Shipping Label Info */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <Truck size={16} className="text-cyan-400" />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Seller Info (Shipping Label)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Printed on the "Shipped By" section of every shipping label</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Seller / Owner Name</label>
              <input type="text" value={config.sellerName} onChange={set('sellerName')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="JAY BHARATBHAI GOLAKIYA" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">GSTIN</label>
              <input type="text" value={config.gstin} onChange={set('gstin')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="24ABCDE1234F1Z5" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Seller Address</label>
            <input type="text" value={config.sellerAddress} onChange={set('sellerAddress')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Building, Street, Area" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">City</label>
              <input type="text" value={config.sellerCity} onChange={set('sellerCity')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Ahmedabad" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">State</label>
              <input type="text" value={config.sellerState} onChange={set('sellerState')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Gujarat" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Pincode</label>
              <input type="text" value={config.sellerPincode} onChange={set('sellerPincode')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="380015" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Phone size={13} /> Seller Phone
              </label>
              <input type="tel" value={config.sellerPhone} onChange={set('sellerPhone')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="9313597170" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Phone size={13} /> Customer Care Number
              </label>
              <input type="tel" value={config.customerCarePhone} onChange={set('customerCarePhone')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="1800-123-4567" />
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
