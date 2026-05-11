import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDriver, getDriverDeliveries, updateDriverStatus, acceptDelivery, declineDelivery } from '../../api/drivers'

interface Driver {
  driver_id: number
  name: string
  phone: string
  status: 'available' | 'busy'
  avg_rating: number | null
  total_ratings: number
}

interface Delivery {
  delivery_id: number
  order_id: number
  order_type: string
  delivery_status: string
  pickup_city: string | null
  pickup_street: string | null
  dropoff_city: string | null
  dropoff_street: string | null
  customer_name: string
}

export default function DriverDashboardPage() {
  const navigate = useNavigate()
  const driverId = Number(localStorage.getItem('driver_id'))

  const [driver, setDriver] = useState<Driver | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [respondingTo, setRespondingTo] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([getDriver(driverId), getDriverDeliveries(driverId)])
      .then(([driverRes, deliveriesRes]) => {
        setDriver(driverRes.data)
        setDeliveries(deliveriesRes.data)
      })
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      getDriverDeliveries(driverId)
        .then(res => setDeliveries(res.data))
        .catch(() => {})
    }, 5000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleToggleStatus() {
    if (!driver) return
    const newStatus = driver.status === 'available' ? 'busy' : 'available'
    setTogglingStatus(true)
    try {
      const res = await updateDriverStatus(driverId, newStatus)
      setDriver(prev => prev ? { ...prev, status: res.data.status } : prev)
    } finally {
      setTogglingStatus(false)
    }
  }

  const offeredDeliveries = deliveries.filter(d => d.delivery_status === 'offered')
  const activeDeliveries = deliveries.filter(
    d => d.delivery_status === 'pending' || d.delivery_status === 'picked_up' || d.delivery_status === 'on_the_way'
  )
  const completedCount = deliveries.filter(d => d.delivery_status === 'delivered').length
  const activeCount = activeDeliveries.length

  async function handleAccept(deliveryId: number) {
    setRespondingTo(deliveryId)
    try {
      await acceptDelivery(deliveryId)
      setDeliveries(prev => prev.map(d =>
        d.delivery_id === deliveryId ? { ...d, delivery_status: 'pending' } : d
      ))
    } finally {
      setRespondingTo(null)
    }
  }

  async function handleDecline(deliveryId: number) {
    setRespondingTo(deliveryId)
    try {
      await declineDelivery(deliveryId)
      setDeliveries(prev => prev.filter(d => d.delivery_id !== deliveryId))
    } finally {
      setRespondingTo(null)
    }
  }

  const isAvailable = driver?.status === 'available'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-max_width mx-auto p-margin">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        {/* Status card */}
        <div className="md:col-span-2 bg-surface-container-lowest p-xl rounded-xxl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-outline-variant/20 flex items-center justify-between relative overflow-hidden group">
          <div className="flex items-center gap-xl relative z-10">
            <div className={`w-16 h-16 rounded-xxl flex items-center justify-center status-glow ${isAvailable ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <span
                className={`material-symbols-outlined !text-[32px] ${isAvailable ? 'text-green-600' : 'text-yellow-600'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isAvailable ? 'check_circle' : 'pause_circle'}
              </span>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-caps text-label-caps uppercase tracking-widest mb-xs">
                Current Status
              </p>
              <h2 className="font-h2 text-h2 text-on-surface">
                You are: <span className={isAvailable ? 'text-green-600' : 'text-yellow-600'}>
                  {isAvailable ? 'Available' : 'Busy'}
                </span>
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant mt-xs">
                {isAvailable
                  ? 'You are visible to customers and ready to receive orders.'
                  : 'You are currently on a delivery or marked as busy.'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-sm relative z-10">
            <label className="relative inline-flex items-center cursor-pointer" onClick={handleToggleStatus}>
              <input readOnly checked={isAvailable} className="sr-only peer" type="checkbox" />
              <div className={`w-14 h-8 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-container peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${isAvailable ? 'bg-primary' : 'bg-surface-variant'} ${togglingStatus ? 'opacity-50' : ''}`}></div>
            </label>
            <span className="text-label-bold font-label-bold text-on-surface-variant">
              {togglingStatus ? 'Updating...' : `Switch to ${isAvailable ? 'Busy' : 'Available'}`}
            </span>
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-primary-container p-xl rounded-xxl text-on-primary-container flex flex-col justify-between shadow-[0_8px_30px_rgba(249,115,22,0.15)]">
          <div>
            <span className="material-symbols-outlined bg-white/20 p-sm rounded-lg mb-md">local_shipping</span>
            <p className="text-label-caps font-label-caps opacity-80 uppercase">Deliveries</p>
            <h2 className="text-h1 font-h1 mt-xs">{deliveries.length}</h2>
          </div>
          <div className="flex flex-col gap-xs mt-xl">
            <div className="flex items-center gap-xs text-body-sm font-body-sm bg-white/10 w-fit px-md py-xs rounded-full">
              <span className="material-symbols-outlined !text-sm">check</span>
              <span>{completedCount} completed · {activeCount} active</span>
            </div>
            {driver?.avg_rating != null && (
              <div className="flex items-center gap-xs text-body-sm font-body-sm bg-white/10 w-fit px-md py-xs rounded-full">
                <span className="material-symbols-outlined !text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span>{driver.avg_rating} / 5.0 avg rating</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Incoming order offers */}
      {offeredDeliveries.length > 0 && (
        <section className="mt-xl">
          <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm mb-lg">
            <span className="material-symbols-outlined text-[#F97316]">notification_important</span>
            Incoming Orders
            <span className="ml-xs px-sm py-xs bg-[#F97316] text-white text-xs rounded-full font-label-bold">{offeredDeliveries.length}</span>
          </h3>
          <div className="space-y-md">
            {offeredDeliveries.map(d => (
              <div key={d.delivery_id} className="bg-surface-container-lowest border-2 border-[#F97316]/40 rounded-xxl p-xl">
                <div className="flex items-center justify-between mb-md">
                  <div>
                    <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-xs">
                      Order #{d.order_id} · {d.order_type}
                    </p>
                    <h4 className="font-h3 text-h3 text-on-surface">{d.customer_name}</h4>
                  </div>
                  <span className="px-md py-sm bg-orange-100 text-[#F97316] font-label-bold rounded-full text-xs animate-pulse">
                    New Order
                  </span>
                </div>
                {d.dropoff_city && (
                  <p className="text-body-sm text-on-surface-variant mb-lg">
                    <span className="font-bold">To:</span> {d.dropoff_city}, {d.dropoff_street}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-md">
                  <button
                    onClick={() => handleAccept(d.delivery_id)}
                    disabled={respondingTo === d.delivery_id}
                    className="flex items-center justify-center gap-sm py-md bg-primary-container text-white font-label-bold rounded-lg hover:shadow-md transition-all disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {respondingTo === d.delivery_id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDecline(d.delivery_id)}
                    disabled={respondingTo === d.delivery_id}
                    className="flex items-center justify-center gap-sm py-md bg-surface-container border border-outline-variant text-on-surface font-label-bold rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    {respondingTo === d.delivery_id ? 'Declining...' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active deliveries section */}
      <section className="mt-xl">
        <div className="flex items-center justify-between mb-lg">
          <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">delivery_dining</span>
            Active Deliveries {activeDeliveries.length > 0 && <span className="ml-xs px-sm py-xs bg-primary-container text-white text-xs rounded-full font-label-bold">{activeDeliveries.length}</span>}
          </h3>
          {activeDeliveries.length > 0 && (
            <button
              onClick={() => navigate('/driver/active')}
              className="px-lg py-sm bg-primary-container text-white font-label-bold rounded-lg text-sm hover:shadow-md transition-all inline-flex items-center gap-sm"
            >
              View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          )}
        </div>
        {activeDeliveries.length > 0 ? (
          <div className="space-y-md">
            {activeDeliveries.map(d => (
              <div key={d.delivery_id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xxl p-xl">
                <div className="flex items-center justify-between mb-md">
                  <div>
                    <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-xs">
                      Order #{d.order_id} · {d.order_type}
                    </p>
                    <h4 className="font-h3 text-h3 text-on-surface">{d.customer_name}</h4>
                  </div>
                  <span className="px-md py-sm bg-orange-100 text-orange-700 font-label-bold rounded-full text-xs capitalize">
                    {d.delivery_status.replace('_', ' ')}
                  </span>
                </div>
                {d.pickup_city && (
                  <p className="text-body-sm text-on-surface-variant mb-xs">
                    <span className="font-bold">From:</span> {d.pickup_city}, {d.pickup_street}
                  </p>
                )}
                {d.dropoff_city && (
                  <p className="text-body-sm text-on-surface-variant">
                    <span className="font-bold">To:</span> {d.dropoff_city}, {d.dropoff_street}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-low border-2 border-dashed border-outline-variant/50 rounded-xxl py-xxl text-center px-xl">
            <h4 className="font-h3 text-h3 text-on-surface-variant">No Active Deliveries</h4>
            <p className="text-body-md font-body-md text-on-surface-variant mt-sm">
              {isAvailable ? 'You are available and waiting for new orders.' : 'Set your status to available to receive orders.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
