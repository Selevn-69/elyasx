import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { getAllRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from '../../api/admin'

interface Restaurant {
  restaurant_id: number
  name: string
  address: string
  phone: string
  cuisine_type: string | null
  delivery_fee: number
}

const emptyForm = { name: '', address: '', phone: '', cuisine_type: '', delivery_fee: '' }

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [editRestaurant, setEditRestaurant] = useState<Restaurant | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editFormError, setEditFormError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  useEffect(() => {
    getAllRestaurants()
      .then(res => setRestaurants(res.data))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    setFormError('')
    if (!form.name.trim() || !form.address.trim() || !form.phone.trim()) {
      setFormError('Name, address, and phone are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await createRestaurant({
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        cuisine_type: form.cuisine_type.trim() || undefined,
        delivery_fee: form.delivery_fee === '' ? 0 : parseFloat(form.delivery_fee),
      })
      setRestaurants(prev => [...prev, res.data])
      setShowAddModal(false)
      setForm(emptyForm)
    } catch (err) {
      setFormError(isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to add restaurant.') : 'Failed to add restaurant.')
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(r: Restaurant) {
    setEditRestaurant(r)
    setEditForm({
      name: r.name,
      address: r.address,
      phone: r.phone,
      cuisine_type: r.cuisine_type ?? '',
      delivery_fee: String(r.delivery_fee),
    })
    setEditFormError('')
  }

  async function handleEdit() {
    setEditFormError('')
    if (!editForm.name.trim() || !editForm.address.trim() || !editForm.phone.trim()) {
      setEditFormError('Name, address, and phone are required.')
      return
    }
    setEditSubmitting(true)
    try {
      const res = await updateRestaurant(editRestaurant!.restaurant_id, {
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
        cuisine_type: editForm.cuisine_type.trim() || undefined,
        delivery_fee: editForm.delivery_fee === '' ? 0 : parseFloat(editForm.delivery_fee),
      })
      setRestaurants(prev => prev.map(r => r.restaurant_id === editRestaurant!.restaurant_id ? res.data : r))
      setEditRestaurant(null)
    } catch (err) {
      setEditFormError(isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to update restaurant.') : 'Failed to update restaurant.')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteRestaurant(id)
      setRestaurants(prev => prev.filter(r => r.restaurant_id !== id))
    } catch (err) {
      alert(isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to delete restaurant.') : 'Failed to delete restaurant.')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary p-margin">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading...
      </div>
    )
  }

  const filtered = restaurants.filter(r =>
    search === '' ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.address.toLowerCase().includes(search.toLowerCase()) ||
    (r.cuisine_type ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const cuisineTypes = [...new Set(restaurants.map(r => r.cuisine_type).filter(Boolean))]

  return (
    <div className="p-margin max-w-max_width mx-auto w-full">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xxl">
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Total Restaurants</p>
          <p className="font-h2 text-h2 text-on-surface">{restaurants.length}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Cuisine Types</p>
          <p className="font-h2 text-h2 text-on-surface">{cuisineTypes.length}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Search Results</p>
          <p className="font-h2 text-h2 text-on-surface">{filtered.length}</p>
        </div>
      </section>

      <section className="bg-[#F8F8F8] rounded-xl shadow-ambient overflow-hidden border border-white/50">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/30 flex-wrap gap-sm">
          <h3 className="font-h3 text-h3 text-on-surface">All Restaurants</h3>
          <div className="flex items-center gap-sm flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, address, or cuisine..."
              className="px-md py-xs bg-white border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline-variant w-72 outline-none focus:border-primary"
            />
            <button
              onClick={() => { setShowAddModal(true); setForm(emptyForm); setFormError('') }}
              className="flex items-center gap-xs px-md py-xs bg-primary text-white font-label-bold text-label-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined !text-[18px]">add</span>
              Add Restaurant
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Restaurant</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Cuisine</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Address</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Phone</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase text-right">Delivery Fee</th>
                <th className="px-lg py-md"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.map(r => (
                <tr key={r.restaurant_id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-lg py-lg">
                    <div className="flex items-center gap-sm">
                      <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-label-bold text-on-surface text-xs shrink-0">
                        {r.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-label-bold text-on-surface">{r.name}</p>
                        <p className="text-body-sm text-on-surface-variant/60">ID #{r.restaurant_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-lg text-on-surface-variant">
                    {r.cuisine_type ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-label-bold bg-orange-100 text-orange-700 whitespace-nowrap">
                        {r.cuisine_type}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">—</span>
                    )}
                  </td>
                  <td className="px-lg py-lg text-on-surface-variant">{r.address}</td>
                  <td className="px-lg py-lg text-on-surface-variant">{r.phone}</td>
                  <td className="px-lg py-lg font-label-bold text-right text-primary">₪{Number(r.delivery_fee).toFixed(2)}</td>
                  <td className="px-lg py-lg">
                    <div className="flex items-center gap-md">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-primary font-label-bold hover:underline text-label-bold"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === r.restaurant_id ? (
                        <div className="flex items-center gap-xs">
                          <span className="text-body-sm text-on-surface-variant">Sure?</span>
                          <button
                            onClick={() => handleDelete(r.restaurant_id)}
                            disabled={deletingId === r.restaurant_id}
                            className="text-error font-label-bold text-label-bold hover:underline disabled:opacity-50"
                          >
                            {deletingId === r.restaurant_id ? 'Deleting...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-on-surface-variant font-label-bold text-label-bold hover:underline"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(r.restaurant_id)}
                          className="text-error font-label-bold hover:underline text-label-bold"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-lg py-xl text-center text-on-surface-variant">
                    No restaurants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editRestaurant && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-gutter"
          onClick={() => setEditRestaurant(null)}
        >
          <div
            className="bg-white rounded-xxl p-[24px] w-full max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-xl">
              <h2 className="font-h3 text-h3 text-on-surface">Edit Restaurant</h2>
              <button onClick={() => setEditRestaurant(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-md">
              {[
                { label: 'Restaurant Name', key: 'name', placeholder: 'e.g. Pizza Palace', type: 'text' },
                { label: 'Address', key: 'address', placeholder: 'e.g. 12 Main St, Nablus', type: 'text' },
                { label: 'Phone', key: 'phone', placeholder: 'e.g. 0599123456', type: 'text' },
                { label: 'Cuisine Type', key: 'cuisine_type', placeholder: 'e.g. Italian (optional)', type: 'text' },
                { label: 'Delivery Fee (₪)', key: 'delivery_fee', placeholder: 'e.g. 5.00', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block font-label-bold text-label-bold text-on-surface-variant mb-xs">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    min={field.type === 'number' ? '0' : undefined}
                    step={field.type === 'number' ? '0.01' : undefined}
                    value={editForm[field.key as keyof typeof editForm]}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-md py-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline-variant outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>

            {editFormError && (
              <p className="mt-md text-error text-body-sm font-label-bold">{editFormError}</p>
            )}

            <div className="flex justify-end gap-sm mt-xl">
              <button
                onClick={() => setEditRestaurant(null)}
                className="px-lg py-sm font-label-bold text-label-bold text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editSubmitting}
                className="px-lg py-sm font-label-bold text-label-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-gutter"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xxl p-[24px] w-full max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-xl">
              <h2 className="font-h3 text-h3 text-on-surface">Add Restaurant</h2>
              <button onClick={() => setShowAddModal(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-md">
              {[
                { label: 'Restaurant Name', key: 'name', placeholder: 'e.g. Pizza Palace', type: 'text' },
                { label: 'Address', key: 'address', placeholder: 'e.g. 12 Main St, Nablus', type: 'text' },
                { label: 'Phone', key: 'phone', placeholder: 'e.g. 0599123456', type: 'text' },
                { label: 'Cuisine Type', key: 'cuisine_type', placeholder: 'e.g. Italian (optional)', type: 'text' },
                { label: 'Delivery Fee (₪)', key: 'delivery_fee', placeholder: 'e.g. 5.00', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block font-label-bold text-label-bold text-on-surface-variant mb-xs">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    min={field.type === 'number' ? '0' : undefined}
                    step={field.type === 'number' ? '0.01' : undefined}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-md py-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline-variant outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>

            {formError && (
              <p className="mt-md text-error text-body-sm font-label-bold">{formError}</p>
            )}

            <div className="flex justify-end gap-sm mt-xl">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-lg py-sm font-label-bold text-label-bold text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="px-lg py-sm font-label-bold text-label-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Restaurant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
