import { useEffect, useState } from 'react'
import { getAllOrders, getAllDrivers, assignDriver } from '../../api/admin'

interface Order {
  order_id: number
  customer_name: string
  customer_phone: string | null
  order_type: string
  status: string
  total_price: number
  created_at: string
  driver_name: string | null
}

interface Driver {
  driver_id: number
  name: string
  status: string
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

const FILTERS = ['All', 'pending', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled']
const FILTER_LABELS: Record<string, string> = {
  All: 'All', pending: 'Pending', assigned: 'Assigned',
  picked_up: 'Picked Up', on_the_way: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled',
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    Promise.all([getAllOrders(), getAllDrivers()])
      .then(([ordersRes, driversRes]) => {
        setOrders(ordersRes.data)
        setDrivers(driversRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = orders.filter(o => {
    const matchFilter = activeFilter === 'All' || o.status === activeFilter
    const matchSearch = search === '' ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      String(o.order_id).includes(search)
    return matchFilter && matchSearch
  })

  async function handleAssign() {
    if (!selectedOrder || !selectedDriverId) return
    setAssigning(true)
    try {
      await assignDriver(selectedOrder.order_id, Number(selectedDriverId))
      const res = await getAllOrders()
      setOrders(res.data)
      const updated = res.data.find((o: Order) => o.order_id === selectedOrder.order_id)
      setSelectedOrder(updated ?? null)
      setSelectedDriverId('')
    } catch {
      // ignore
    } finally {
      setAssigning(false)
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

  const deliveredCount = orders.filter(o => o.status === 'delivered').length
  const inTransitCount = orders.filter(o => ['assigned', 'picked_up', 'on_the_way'].includes(o.status)).length
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length

  return (
    <div className="p-margin max-w-max_width mx-auto w-full">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xxl">
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Total Orders</p>
          <p className="font-h2 text-h2 text-on-surface">{orders.length}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Delivered</p>
          <p className="font-h2 text-h2 text-green-600">{deliveredCount}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">In Transit</p>
          <p className="font-h2 text-h2 text-blue-600">{inTransitCount}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Cancelled</p>
          <p className="font-h2 text-h2 text-red-500">{cancelledCount}</p>
        </div>
      </section>

      <section className="bg-[#F8F8F8] rounded-xl shadow-ambient overflow-hidden border border-white/50">
        <div className="px-lg py-md border-b border-outline-variant/30 space-y-sm">
          <div className="flex items-center justify-between flex-wrap gap-sm">
            <h3 className="font-h3 text-h3 text-on-surface">All Orders</h3>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer or order ID..."
              className="px-md py-xs bg-white border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline-variant w-64 outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-sm flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-md py-xs rounded-full font-label-bold text-label-bold transition-colors ${
                  activeFilter === f ? 'bg-primary-container text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-outline-variant/20'
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
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
              {filtered.map(order => (
                <tr
                  key={order.order_id}
                  onClick={() => { setSelectedOrder(order); setSelectedDriverId('') }}
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
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-lg py-xl text-center text-on-surface-variant">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-gutter" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xxl p-[24px] w-full max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                { label: 'Phone', value: selectedOrder.customer_phone ?? 'N/A', icon: 'phone' },
                { label: 'Order Type', value: selectedOrder.order_type, icon: orderTypeIcon[selectedOrder.order_type] ?? 'receipt_long' },
                { label: 'Driver', value: selectedOrder.driver_name ?? 'Unassigned', icon: 'local_shipping' },
                { label: 'Amount', value: `₪${selectedOrder.total_price.toFixed(2)}`, icon: 'payments' },
                { label: 'Date', value: formatDate(selectedOrder.created_at), icon: 'calendar_today' },
              ].map(row => (
                <>
                  <div key={`label-${row.label}`} className="flex items-center gap-sm text-on-surface-variant whitespace-nowrap">
                    <span className="material-symbols-outlined text-primary !text-[18px]">{row.icon}</span>
                    <span className="text-body-sm font-label-bold">{row.label}</span>
                  </div>
                  <p key={`value-${row.label}`} className="font-label-bold text-on-surface text-body-sm capitalize">{row.value}</p>
                </>
              ))}
            </div>
            {selectedOrder.status === 'pending' && (
              <div className="mt-xl border-t border-outline-variant/20 pt-lg space-y-sm">
                <p className="font-label-bold text-label-bold text-on-surface-variant">Assign Driver</p>
                <div className="flex gap-sm">
                  <select
                    value={selectedDriverId}
                    onChange={e => setSelectedDriverId(e.target.value)}
                    className="flex-1 px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface outline-none focus:border-primary"
                  >
                    <option value="">Select a driver...</option>
                    {drivers.filter(d => d.status === 'available').map(d => (
                      <option key={d.driver_id} value={d.driver_id}>{d.name} (available)</option>
                    ))}
                    {drivers.filter(d => d.status !== 'available').map(d => (
                      <option key={d.driver_id} value={d.driver_id}>{d.name} ({d.status})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedDriverId || assigning}
                    className="px-lg py-sm bg-primary-container text-white font-label-bold rounded-lg disabled:opacity-50 hover:shadow-md transition-all"
                  >
                    {assigning ? 'Sending...' : 'Assign'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
