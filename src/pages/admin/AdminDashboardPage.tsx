import { useEffect, useState } from 'react'
import { getAdminStats, getAllOrders } from '../../api/admin'

interface Stats {
  total_orders: number
  total_customers: number
  total_revenue: number
  available_drivers: number
  orders_today: number
  revenue_today: number
  active_deliveries: number
  open_tickets: number
}

interface Order {
  order_id: number
  customer_name: string
  order_type: string
  status: string
  total_price: number
  created_at: string
  driver_name: string | null
}

const statusClass: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-purple-100 text-purple-700',
  on_the_way: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const orderTypeIcon: Record<string, string> = {
  food: 'restaurant',
  package: 'inventory_2',
  online: 'shopping_bag',
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAdminStats(), getAllOrders()])
      .then(([statsRes, ordersRes]) => {
        setStats(statsRes.data)
        setOrders(ordersRes.data.slice(0, 10))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary p-margin">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading...
      </div>
    )
  }

  const statCards = stats ? [
    { label: 'Total Orders', value: String(stats.total_orders), icon: 'receipt_long', trend: `${stats.orders_today} today` },
    { label: 'Available Drivers', value: String(stats.available_drivers), icon: 'local_shipping', trend: `${stats.active_deliveries} active deliveries` },
    { label: 'Customers', value: String(stats.total_customers), icon: 'people', trend: `${stats.open_tickets} open tickets` },
    { label: 'Total Revenue', value: `₪${stats.total_revenue.toFixed(2)}`, icon: 'payments', accent: true, trend: `₪${stats.revenue_today.toFixed(2)} today` },
  ] : []

  return (
    <div className="p-margin max-w-max_width mx-auto w-full">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xxl">
        {statCards.map((stat) =>
          stat.accent ? (
            <div key={stat.label} className="bg-primary-container p-lg rounded-xxl text-white flex flex-col justify-between shadow-[0_8px_30px_rgba(249,115,22,0.15)]">
              <div>
                <span className="material-symbols-outlined bg-white/20 p-sm rounded-lg mb-md block w-fit">{stat.icon}</span>
                <p className="font-label-caps text-label-caps opacity-80 uppercase">{stat.label}</p>
                <h2 className="font-h2 text-h2 mt-xs">{stat.value}</h2>
              </div>
              <div className="flex items-center gap-xs mt-xl text-body-sm font-body-sm bg-white/10 w-fit px-md py-xs rounded-full">
                <span className="material-symbols-outlined !text-sm">trending_up</span>
                <span>{stat.trend}</span>
              </div>
            </div>
          ) : (
            <div key={stat.label} className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-sm">
                <p className="font-label-bold text-label-bold text-on-surface-variant">{stat.label}</p>
                <span className="material-symbols-outlined text-primary">{stat.icon}</span>
              </div>
              <p className="font-h2 text-h2 text-on-surface">{stat.value}</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-xs">{stat.trend}</p>
            </div>
          )
        )}
      </section>

      <section className="bg-[#F8F8F8] rounded-xl shadow-ambient overflow-hidden border border-white/50">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/30">
          <h3 className="font-h3 text-h3 text-on-surface">Recent Orders</h3>
          <span className="text-body-sm font-body-sm text-on-surface-variant">Last 10</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Order ID</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Customer</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Type</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Driver</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Status</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase text-right">Amount</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {orders.map((order) => (
                <tr
                  key={order.order_id}
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-surface-container-lowest/50 transition-colors cursor-pointer"
                >
                  <td className="px-lg py-lg font-label-bold text-primary">#{order.order_id}</td>
                  <td className="px-lg py-lg text-on-surface">{order.customer_name}</td>
                  <td className="px-lg py-lg">
                    <div className="flex items-center gap-sm text-on-surface capitalize">
                      <span className="material-symbols-outlined text-primary">{orderTypeIcon[order.order_type] ?? 'receipt_long'}</span>
                      {order.order_type}
                    </div>
                  </td>
                  <td className="px-lg py-lg text-on-surface-variant">{order.driver_name ?? 'Unassigned'}</td>
                  <td className="px-lg py-lg">
                    <span className={`px-3 py-1 rounded-full font-label-bold text-xs whitespace-nowrap ${statusClass[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {formatStatus(order.status)}
                    </span>
                  </td>
                  <td className="px-lg py-lg font-label-bold text-right text-on-surface">₪{order.total_price.toFixed(2)}</td>
                  <td className="px-lg py-lg text-on-surface-variant/60">{formatDate(order.created_at)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-lg py-xl text-center text-on-surface-variant">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-gutter" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xxl p-[24px] w-full max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.15)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-xl">
              <div>
                <span className="font-label-bold text-primary">#{selectedOrder.order_id}</span>
                <h2 className="font-h3 text-h3 text-on-surface">Order Details</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex items-center gap-lg mb-xl">
              <div className="w-16 h-16 rounded-xxl bg-surface-container-low flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary !text-[32px]">{orderTypeIcon[selectedOrder.order_type] ?? 'receipt_long'}</span>
              </div>
              <div>
                <h3 className="font-h3 text-h3 text-on-surface">{selectedOrder.customer_name}</h3>
                <p className="text-body-sm text-on-surface-variant capitalize">{selectedOrder.order_type} Order</p>
                <span className={`px-3 py-1 rounded-full font-label-bold text-xs mt-xs inline-block ${statusClass[selectedOrder.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {formatStatus(selectedOrder.status)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-xl gap-y-md items-center border-t border-outline-variant/20 pt-lg">
              {[
                { label: 'Order ID', value: `#${selectedOrder.order_id}`, icon: 'receipt_long' },
                { label: 'Customer', value: selectedOrder.customer_name, icon: 'person' },
                { label: 'Order Type', value: selectedOrder.order_type, icon: orderTypeIcon[selectedOrder.order_type] ?? 'receipt_long' },
                { label: 'Assigned Driver', value: selectedOrder.driver_name ?? 'Unassigned', icon: 'local_shipping' },
                { label: 'Amount', value: `₪${selectedOrder.total_price.toFixed(2)}`, icon: 'payments' },
                { label: 'Date', value: formatDate(selectedOrder.created_at), icon: 'calendar_today' },
              ].map((row) => (
                <>
                  <div key={`label-${row.label}`} className="flex items-center gap-sm text-on-surface-variant whitespace-nowrap">
                    <span className="material-symbols-outlined text-primary !text-[18px]">{row.icon}</span>
                    <span className="text-body-sm font-label-bold">{row.label}</span>
                  </div>
                  <p key={`value-${row.label}`} className="font-label-bold text-on-surface text-body-sm capitalize">{row.value}</p>
                </>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
