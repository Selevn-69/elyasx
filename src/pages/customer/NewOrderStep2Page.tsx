import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAddresses } from '../../api/addresses'
import api from '../../api/axios'

interface Address {
  address_id: number
  city: string
  street: string
  building: string | null
}

interface Restaurant {
  restaurant_id: number
  name: string
  cuisine_type: string | null
  delivery_fee: number
}

const DEFAULT_DELIVERY_FEE = 10.00

interface OrderDetails {
  total_price: number
  dropoff_address_id: number
  restaurant_id?: number
  items_description?: string
  description?: string
  weight?: number
  fragile?: boolean
  store_name?: string
  product_link?: string
  notes?: string
}

export default function NewOrderStep2Page() {
  const navigate = useNavigate()
  const orderType = sessionStorage.getItem('newOrderType') as 'food' | 'package' | 'online' | null
  const customerId = Number(localStorage.getItem('customer_id'))

  const [addresses, setAddresses] = useState<Address[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  // Food
  const [restaurantId, setRestaurantId] = useState('')
  const [itemsDescription, setItemsDescription] = useState('')

  // Package
  const [pkgDescription, setPkgDescription] = useState('')
  const [weight, setWeight] = useState('')
  const [fragile, setFragile] = useState(false)

  // Online
  const [storeName, setStoreName] = useState('')
  const [productLink, setProductLink] = useState('')
  const [onlineNotes, setOnlineNotes] = useState('')

  // Common
  const [dropoffAddressId, setDropoffAddressId] = useState('')

  useEffect(() => {
    if (!orderType) { navigate('/new-order'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetches: Promise<any>[] = [getAddresses(customerId)]
    if (orderType === 'food') fetches.push(api.get('/restaurants/'))
    Promise.all(fetches)
      .then(([addrRes, restRes]) => {
        setAddresses(addrRes.data)
        if (addrRes.data.length > 0) setDropoffAddressId(String(addrRes.data[0].address_id))
        if (restRes) {
          setRestaurants(restRes.data)
          if (restRes.data.length > 0) setRestaurantId(String(restRes.data[0].restaurant_id))
        }
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedRestaurant = restaurants.find(r => String(r.restaurant_id) === restaurantId)
  const deliveryFee = orderType === 'food' && selectedRestaurant
    ? Number(selectedRestaurant.delivery_fee)
    : DEFAULT_DELIVERY_FEE

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!dropoffAddressId) return
    let details: OrderDetails = {
      total_price: deliveryFee,
      dropoff_address_id: Number(dropoffAddressId),
    }
    if (orderType === 'food') {
      details = { ...details, restaurant_id: Number(restaurantId), items_description: itemsDescription }
    } else if (orderType === 'package') {
      details = { ...details, description: pkgDescription, weight: Number(weight), fragile }
    } else if (orderType === 'online') {
      details = { ...details, store_name: storeName, product_link: productLink, notes: onlineNotes }
    }
    sessionStorage.setItem('newOrderDetails', JSON.stringify(details))
    navigate('/payment')
  }

  const typeLabel = orderType === 'food' ? 'Food Delivery' : orderType === 'package' ? 'Package Shipping' : 'Online Order'
  const inputCls = 'w-full px-md py-md bg-surface border border-outline-variant rounded-lg font-body-md'
  const selectCls = 'w-full px-md py-md bg-surface border border-outline-variant rounded-lg font-body-md'

  const addressSelect = addresses.length === 0 ? (
    <p className="text-red-500 text-sm">No saved addresses. <a href="/addresses" className="underline">Add one first.</a></p>
  ) : (
    <select className={selectCls} value={dropoffAddressId} onChange={e => setDropoffAddressId(e.target.value)} required>
      {addresses.map(a => (
        <option key={a.address_id} value={a.address_id}>
          {a.city} — {a.street}{a.building ? `, ${a.building}` : ''}
        </option>
      ))}
    </select>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading...
      </div>
    )
  }

  return (
    <form onSubmit={handleNext} className="grid grid-cols-12 gap-gutter">
      <div className="col-span-8 space-y-gutter">
        <section className="bg-surface-container-lowest p-lg rounded-xl shadow-sm space-y-xl">

          {/* Food fields */}
          {orderType === 'food' && (
            <>
              <div className="space-y-md">
                <label className="flex items-center gap-sm font-label-bold text-primary">
                  <span className="material-symbols-outlined">storefront</span> Restaurant
                </label>
                <select className={selectCls} value={restaurantId} onChange={e => setRestaurantId(e.target.value)} required>
                  {restaurants.map(r => (
                    <option key={r.restaurant_id} value={r.restaurant_id}>
                      {r.name}{r.cuisine_type ? ` — ${r.cuisine_type}` : ''} · ₪{Number(r.delivery_fee).toFixed(2)} delivery
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-md">
                <label className="flex items-center gap-sm font-label-bold text-primary">
                  <span className="material-symbols-outlined">restaurant_menu</span> Items Description
                </label>
                <textarea
                  className="w-full p-md bg-surface border border-outline-variant rounded-lg font-body-md"
                  rows={3}
                  placeholder="e.g. Mansaf + Rice + Salad"
                  value={itemsDescription}
                  onChange={e => setItemsDescription(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Package fields */}
          {orderType === 'package' && (
            <>
              <div className="space-y-md">
                <label className="flex items-center gap-sm font-label-bold text-primary">
                  <span className="material-symbols-outlined">inventory_2</span> Package Description
                </label>
                <input className={inputCls} placeholder="e.g. Books and documents" value={pkgDescription} onChange={e => setPkgDescription(e.target.value)} required />
              </div>
              <div className="space-y-md">
                <label className="flex items-center gap-sm font-label-bold text-primary">
                  <span className="material-symbols-outlined">scale</span> Weight (kg)
                </label>
                <input className={inputCls} type="number" step="0.1" min="0.1" placeholder="e.g. 2.5" value={weight} onChange={e => setWeight(e.target.value)} required />
              </div>
              <div className="flex items-center gap-md">
                <input type="checkbox" id="fragile" checked={fragile} onChange={e => setFragile(e.target.checked)} className="w-5 h-5 accent-primary-container" />
                <label htmlFor="fragile" className="font-label-bold cursor-pointer">Fragile item — handle with care</label>
              </div>
            </>
          )}

          {/* Online fields */}
          {orderType === 'online' && (
            <>
              <div className="space-y-md">
                <label className="flex items-center gap-sm font-label-bold text-primary">
                  <span className="material-symbols-outlined">storefront</span> Store Name
                </label>
                <input className={inputCls} placeholder="e.g. Amazon" value={storeName} onChange={e => setStoreName(e.target.value)} required />
              </div>
              <div className="space-y-md">
                <label className="flex items-center gap-sm font-label-bold text-primary">
                  <span className="material-symbols-outlined">link</span> Product Link
                </label>
                <input className={inputCls} type="url" placeholder="https://..." value={productLink} onChange={e => setProductLink(e.target.value)} required />
              </div>
              <div className="space-y-md">
                <label className="flex items-center gap-sm font-label-bold text-primary">
                  <span className="material-symbols-outlined">edit_note</span> Notes
                </label>
                <textarea
                  className="w-full p-md bg-surface border border-outline-variant rounded-lg font-body-md"
                  rows={3}
                  placeholder="e.g. Handle with care, size L"
                  value={onlineNotes}
                  onChange={e => setOnlineNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Dropoff address — all types */}
          <div className="space-y-md">
            <label className="flex items-center gap-sm font-label-bold text-primary">
              <span className="material-symbols-outlined">location_on</span> Dropoff Address
            </label>
            {addressSelect}
          </div>
        </section>
      </div>

      <div className="col-span-4">
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-surface-variant">
          <h3 className="font-h3 text-[26px] leading-tight text-inverse-surface mb-lg border-b pb-md">Summary</h3>
          <div className="space-y-md mb-xl">
            <div className="flex justify-between">
              <span>Order Type</span>
              <span className="font-label-bold">{typeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-label-bold">₪{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-md">
              <span className="font-h3">Total</span>
              <span className="font-h3 text-primary">₪{deliveryFee.toFixed(2)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!dropoffAddressId}
            className="w-full bg-primary-container text-white font-h3 py-md rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Payment <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </form>
  )
}
