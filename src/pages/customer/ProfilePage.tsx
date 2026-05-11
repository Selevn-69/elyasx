import { useEffect, useState } from 'react'
import api from '../../api/axios'

interface Customer {
  customer_id: number
  name: string
  email: string
  phone: string
  points: number
}

export default function ProfilePage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const customerId = localStorage.getItem('customer_id')

  useEffect(() => {
    if (!customerId) return
    api.get(`/customers/${customerId}`)
      .then((res) => {
        setCustomer(res.data)
        setEditName(res.data.name)
        setEditPhone(res.data.phone)
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [customerId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      const res = await api.put(`/customers/${customerId}`, { name: editName, phone: editPhone })
      setCustomer(res.data)
      localStorage.setItem('userName', res.data.name)
      localStorage.setItem('userPhone', res.data.phone)
      setShowEdit(false)
    } catch {
      setSaveError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading profile...
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center py-xxl text-red-500 gap-sm">
        <span className="material-symbols-outlined">error</span>
        {error || 'Customer not found.'}
      </div>
    )
  }

  const initial = customer.name.charAt(0).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto space-y-xl">
      {/* Avatar + name card */}
      <div className="bg-[#F8F8F8] p-xl rounded-xl shadow-sm text-center">
        <div className="w-24 h-24 rounded-full mx-auto mb-md flex items-center justify-center bg-[#F97316] text-white text-4xl font-bold">
          {initial}
        </div>
        <h2 className="text-h2 font-h2">{customer.name}</h2>
        <p className="text-[#6B7280] text-sm mt-xs">Customer #{customer.customer_id}</p>
      </div>

      {/* Info card */}
      <div className="bg-[#F8F8F8] p-xl rounded-xl shadow-sm space-y-lg">
        <div className="flex justify-between border-b border-[#E5E5E5] pb-md">
          <span className="text-[#6B7280]">Email</span>
          <span className="font-bold text-[#111111]">{customer.email}</span>
        </div>
        <div className="flex justify-between border-b border-[#E5E5E5] pb-md">
          <span className="text-[#6B7280]">Phone</span>
          <span className="font-bold text-[#111111]">{customer.phone}</span>
        </div>
        <div className="flex justify-between border-b border-[#E5E5E5] pb-md">
          <span className="text-[#6B7280]">Customer ID</span>
          <span className="font-bold text-[#111111]">#{customer.customer_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Points</span>
          <span className="font-bold text-[#F97316]">{customer.points.toLocaleString()} pts</span>
        </div>
      </div>

      <button
        onClick={() => { setShowEdit(true); setSaveError('') }}
        className="w-full py-md bg-[#F97316] text-white rounded-lg font-bold hover:brightness-105 active:scale-[0.98] transition-all"
      >
        Edit Profile
      </button>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-md">
          <div className="bg-white rounded-xl p-xxl w-full max-w-[480px] shadow-xl">
            <div className="flex justify-between items-center mb-xl">
              <h3 className="font-h3 text-[#111111]">Edit Profile</h3>
              <button onClick={() => setShowEdit(false)} className="text-[#6B7280] hover:text-[#111111]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-md py-sm text-sm mb-md">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-md">
              <div>
                <label className="font-bold text-sm text-[#6B7280] mb-xs block">Full Name</label>
                <input
                  className="w-full bg-white border border-[#E5E5E5] rounded-lg px-md py-sm focus:outline-none focus:border-[#F97316]"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="font-bold text-sm text-[#6B7280] mb-xs block">Phone</label>
                <input
                  className="w-full bg-white border border-[#E5E5E5] rounded-lg px-md py-sm focus:outline-none focus:border-[#F97316]"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-md pt-sm">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 py-md border border-[#E5E5E5] rounded-lg font-bold text-[#111111] hover:bg-[#F8F8F8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-md bg-[#F97316] text-white rounded-lg font-bold disabled:opacity-60 hover:brightness-105 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
