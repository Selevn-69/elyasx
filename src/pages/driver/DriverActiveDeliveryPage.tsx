import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDriverDeliveries, updateDeliveryStatus } from '../../api/drivers'

interface Delivery {
  delivery_id: number
  order_id: number
  order_type: string
  delivery_status: string
  total_price: number
  customer_name: string
  customer_phone: string
  pickup_city: string | null
  pickup_street: string | null
  pickup_building: string | null
  dropoff_city: string | null
  dropoff_street: string | null
  dropoff_building: string | null
}

const typeIcon: Record<string, string> = {
  food: 'restaurant',
  package: 'inventory_2',
  online: 'shopping_basket',
}

const statusLabel: Record<string, string> = {
  pending: 'Pending Pickup',
  picked_up: 'Picked Up',
  on_the_way: 'On the Way',
}

export default function DriverActiveDeliveryPage() {
  const navigate = useNavigate()
  const driverId = Number(localStorage.getItem('driver_id'))

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  useEffect(() => {
    getDriverDeliveries(driverId)
      .then(res => {
        const active = res.data.filter(
          (d: Delivery) => d.delivery_status === 'pending' || d.delivery_status === 'picked_up' || d.delivery_status === 'on_the_way'
        )
        setDeliveries(active)
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpdateStatus(deliveryId: number, newStatus: string) {
    setUpdating(deliveryId)
    try {
      const res = await updateDeliveryStatus(deliveryId, newStatus)
      if (newStatus === 'delivered' || newStatus === 'failed') {
        setDeliveries(prev => prev.filter(d => d.delivery_id !== deliveryId))
      } else {
        setDeliveries(prev =>
          prev.map(d => d.delivery_id === deliveryId ? { ...d, delivery_status: res.data.delivery_status } : d)
        )
      }
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading...
      </div>
    )
  }

  if (deliveries.length === 0) {
    return (
      <div className="p-xl max-w-max_width mx-auto text-center py-xxl">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">inbox</span>
        <h3 className="font-h3 text-on-surface-variant mt-md">No active deliveries</h3>
        <button onClick={() => navigate('/driver')} className="mt-xl px-xl py-md bg-primary-container text-white font-label-bold rounded-lg">
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="p-xl max-w-max_width mx-auto">
      <div className="flex items-center justify-between mb-xl">
        <div>
          <h1 className="font-h2 text-on-surface">Active Deliveries</h1>
          <p className="text-on-surface-variant font-body-md">{deliveries.length} active {deliveries.length === 1 ? 'delivery' : 'deliveries'}</p>
        </div>
      </div>

      <div className="space-y-lg">
        {deliveries.map(delivery => {
          const status = delivery.delivery_status
          const canPickUp = status === 'pending'
          const canDeliver = status === 'picked_up' || status === 'on_the_way'
          const isUpdating = updating === delivery.delivery_id

          const pickupText = delivery.pickup_city
            ? `${delivery.pickup_city}, ${delivery.pickup_street}${delivery.pickup_building ? `, ${delivery.pickup_building}` : ''}`
            : 'Not specified'
          const dropoffText = delivery.dropoff_city
            ? `${delivery.dropoff_city}, ${delivery.dropoff_street}${delivery.dropoff_building ? `, ${delivery.dropoff_building}` : ''}`
            : 'Not specified'

          return (
            <div key={delivery.delivery_id} className="bg-surface-container-lowest rounded-xl custom-shadow p-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-lg">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined">{typeIcon[delivery.order_type] ?? 'local_shipping'}</span>
                  </div>
                  <div>
                    <p className="font-label-bold text-on-surface">Order #{delivery.order_id}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{delivery.order_type}</p>
                  </div>
                </div>
                <span className="px-md py-xs bg-orange-100 text-orange-700 font-label-bold rounded-full text-xs capitalize">
                  {statusLabel[status] ?? status.replace('_', ' ')}
                </span>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
                <div className="bg-surface-container-low rounded-lg p-md">
                  <p className="text-xs text-on-surface-variant uppercase font-label-bold mb-xs">Pickup</p>
                  <p className="font-label-bold text-on-surface text-sm">{pickupText}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-md">
                  <p className="text-xs text-on-surface-variant uppercase font-label-bold mb-xs">Drop-off</p>
                  <p className="font-label-bold text-on-surface text-sm">{dropoffText}</p>
                </div>
              </div>

              {/* Customer */}
              <div className="flex items-center justify-between mb-lg">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold">
                    {delivery.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-label-bold text-on-surface">{delivery.customer_name}</p>
                    <p className="text-xs text-on-surface-variant">{delivery.customer_phone}</p>
                  </div>
                </div>
                <a
                  href={`tel:${delivery.customer_phone}`}
                  className="flex items-center gap-xs px-md py-sm bg-surface-container-low rounded-lg font-label-bold text-sm"
                >
                  <span className="material-symbols-outlined text-primary-container text-[18px]">call</span>
                  Call
                </a>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-md">
                <button
                  onClick={() => canPickUp && handleUpdateStatus(delivery.delivery_id, 'picked_up')}
                  disabled={!canPickUp || isUpdating}
                  className={`flex items-center justify-center gap-sm py-md rounded-lg font-label-bold transition-all ${
                    canPickUp
                      ? 'bg-primary-container text-white'
                      : 'bg-secondary-container text-on-secondary-container opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {isUpdating && canPickUp ? 'Updating...' : 'Mark Picked Up'}
                </button>
                <button
                  onClick={() => canDeliver && handleUpdateStatus(delivery.delivery_id, 'delivered')}
                  disabled={!canDeliver || isUpdating}
                  className={`flex items-center justify-center gap-sm py-md rounded-lg font-label-bold transition-all ${
                    canDeliver
                      ? 'bg-primary-container text-white'
                      : 'bg-secondary-container text-on-secondary-container opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  {isUpdating && canDeliver ? 'Updating...' : 'Mark Delivered'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
