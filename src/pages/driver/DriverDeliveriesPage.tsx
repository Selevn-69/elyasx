import { useEffect, useState } from 'react'
import { getDriverDeliveries, getDriver } from '../../api/drivers'

interface Delivery {
  delivery_id: number
  order_id: number
  order_type: string
  delivery_status: string
  total_price: number
  created_at: string
  customer_name: string
}

const statusClass: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  declined: 'bg-red-100 text-red-700',
  on_the_way: 'bg-orange-100 text-orange-700',
  picked_up: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  offered: 'bg-purple-100 text-purple-700',
}

const typeIcon: Record<string, string> = {
  food: 'restaurant',
  package: 'inventory_2',
  online: 'shopping_basket',
}

export default function DriverDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const driverId = Number(localStorage.getItem('driver_id'))

  useEffect(() => {
    Promise.all([getDriverDeliveries(driverId), getDriver(driverId)])
      .then(([deliveriesRes, driverRes]) => {
        setDeliveries(deliveriesRes.data)
        setAvgRating(driverRes.data.avg_rating ?? null)
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completed = deliveries.filter(d => d.delivery_status === 'delivered')
  const totalEarnings = completed.reduce((sum, d) => sum + (d.total_price || 0), 0)

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="p-margin max-w-max_width mx-auto w-full">
      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xxl">
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Total Earnings</p>
          <p className="font-h2 text-h2 text-primary">₪{totalEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Completed</p>
          <p className="font-h2 text-h2 text-on-surface">{completed.length}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Avg. Rating</p>
          <div className="flex items-center gap-xs">
            <p className="font-h2 text-h2 text-on-surface">{avgRating ?? '—'}</p>
            {avgRating !== null && (
              <span
                className="material-symbols-outlined text-[#F97316]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >star</span>
            )}
          </div>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Total Deliveries</p>
          <p className="font-h2 text-h2 text-on-surface">{deliveries.length}</p>
        </div>
      </section>

      {/* Delivery history table */}
      <section className="bg-[#F8F8F8] rounded-xl shadow-ambient overflow-hidden border border-white/50">
        {loading ? (
          <div className="flex items-center justify-center py-xxl gap-md text-secondary">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Loading deliveries...
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex items-center justify-center py-xxl text-secondary">No deliveries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Delivery ID</th>
                  <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Type</th>
                  <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Customer</th>
                  <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Status</th>
                  <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase text-right">Price</th>
                  <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {deliveries.map((d) => (
                  <tr key={d.delivery_id} className="hover:bg-surface-container-lowest/50 transition-colors group">
                    <td className="px-lg py-lg font-label-bold text-primary">#{d.delivery_id}</td>
                    <td className="px-lg py-lg">
                      <div className="flex items-center gap-sm capitalize">
                        <span className="material-symbols-outlined text-primary">{typeIcon[d.order_type] ?? 'local_shipping'}</span>
                        {d.order_type}
                      </div>
                    </td>
                    <td className="px-lg py-lg">{d.customer_name}</td>
                    <td className="px-lg py-lg">
                      <span className={`px-3 py-1 rounded-full font-label-bold text-xs capitalize ${statusClass[d.delivery_status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {d.delivery_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-lg py-lg font-label-bold text-right">₪{(d.total_price ?? 0).toFixed(2)}</td>
                    <td className="px-lg py-lg text-on-surface-variant/60">{d.created_at ? formatDate(d.created_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
