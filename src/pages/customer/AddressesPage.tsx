import { useEffect, useState } from 'react'
import { getAddresses, addAddress, deleteAddress } from '../../api/addresses'

interface Address {
  address_id: number
  city: string
  street: string
  building: string | null
  notes: string | null
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  // New address form state
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [building, setBuilding] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const customerId = Number(localStorage.getItem('customer_id'))

  useEffect(() => {
    fetchAddresses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fetchAddresses() {
    setLoading(true)
    getAddresses(customerId)
      .then((res) => setAddresses(res.data))
      .catch(() => setError('Failed to load addresses.'))
      .finally(() => setLoading(false))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await addAddress({ customer_id: customerId, city, street, building: building || undefined, notes: notes || undefined })
      setCity(''); setStreet(''); setBuilding(''); setNotes('')
      setShowModal(false)
      fetchAddresses()
    } catch {
      setFormError('Failed to save address. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteAddress(id)
      setAddresses((prev) => prev.filter((a) => a.address_id !== id))
    } catch {
      alert('Failed to delete address.')
    }
  }

  const inputCls = 'w-full bg-white border border-[#E5E5E5] rounded-lg px-md py-sm focus:outline-none focus:border-primary-container text-body-md'

  return (
    <>
      <div className="flex justify-between items-center mb-xxl">
        <div>
          <h2 className="font-h2 text-[34px] leading-tight text-inverse-surface">My Addresses</h2>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError('') }}
          className="bg-primary-container text-white px-xl py-md rounded-lg font-label-bold flex items-center gap-sm"
        >
          + Add New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-xxl gap-md text-secondary">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Loading addresses...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-xxl text-red-500 gap-sm">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex items-center justify-center py-xxl text-secondary">No addresses saved yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {addresses.map((item) => (
            <div key={item.address_id} className="bg-[#F8F8F8] p-lg rounded-xl border-t-4 border-primary shadow-sm relative group">
              <div className="flex justify-between mb-md">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">location_on</span>
                  {item.city}
                </span>
                <button
                  onClick={() => handleDelete(item.address_id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                  title="Delete address"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <h4 className="font-label-bold">{item.street}</h4>
              {item.building && (
                <p className="text-body-sm text-on-surface-variant">{item.building}</p>
              )}
              {item.notes && (
                <p className="text-body-sm text-on-surface-variant mt-xs">{item.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Address Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-md">
          <div className="bg-white rounded-xl p-xxl w-full max-w-[480px] shadow-xl">
            <div className="flex justify-between items-center mb-xl">
              <h3 className="font-h3 text-[26px] leading-tight text-inverse-surface">Add New Address</h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-md py-sm text-body-sm mb-md">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-md">
              <div>
                <label className="font-label-bold text-label-bold text-on-surface-variant mb-xs block">City *</label>
                <input className={inputCls} placeholder="e.g. San Francisco" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div>
                <label className="font-label-bold text-label-bold text-on-surface-variant mb-xs block">Street *</label>
                <input className={inputCls} placeholder="e.g. 123 Market St" value={street} onChange={(e) => setStreet(e.target.value)} required />
              </div>
              <div>
                <label className="font-label-bold text-label-bold text-on-surface-variant mb-xs block">Building / Apt</label>
                <input className={inputCls} placeholder="e.g. Apt 4B" value={building} onChange={(e) => setBuilding(e.target.value)} />
              </div>
              <div>
                <label className="font-label-bold text-label-bold text-on-surface-variant mb-xs block">Notes</label>
                <input className={inputCls} placeholder="e.g. Ring doorbell twice" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-md pt-sm">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-md border border-[#E5E5E5] rounded-lg font-label-bold text-on-surface hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-md bg-primary-container text-white rounded-lg font-label-bold disabled:opacity-60 hover:brightness-105 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
