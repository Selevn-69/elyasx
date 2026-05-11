import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomerOrders } from '../../api/orders'

const statusClass: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-purple-100 text-purple-700',
  on_the_way: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface Order {
  order_id: number
  order_type: string
  status: string
  total_price: number
  created_at: string
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const customerId = localStorage.getItem('customer_id')
    if (!customerId) return

    getCustomerOrders(Number(customerId))
      .then((res) => setOrders(res.data))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      getCustomerOrders(Number(customerId))
        .then((res) => setOrders(res.data))
        .catch(() => {})
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading orders...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-xxl text-red-500 gap-sm">
        <span className="material-symbols-outlined">error</span>
        {error}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-xxl text-secondary">
        No orders yet.
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border">
      <table className="w-full text-left">
        <thead className="bg-surface-container">
          <tr>
            <th className="px-lg py-md font-label-bold text-xs">Order ID</th>
            <th className="px-lg py-md font-label-bold text-xs">Type</th>
            <th className="px-lg py-md font-label-bold text-xs">Status</th>
            <th className="px-lg py-md font-label-bold text-xs">Price</th>
            <th className="px-lg py-md font-label-bold text-xs">Date</th>
            <th className="px-lg py-md"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((ord) => (
            <tr key={ord.order_id} className="hover:bg-surface-container-low/30">
              <td className="px-lg py-md font-label-bold text-primary">#{ord.order_id}</td>
              <td className="px-lg py-md capitalize">{ord.order_type}</td>
              <td className="px-lg py-md">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusClass[ord.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {ord.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-lg py-md font-label-bold">₪{ord.total_price.toFixed(2)}</td>
              <td className="px-lg py-md text-body-sm text-secondary">
                {new Date(ord.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
              <td className="px-lg py-md text-right">
                <button onClick={() => navigate(`/orders/${ord.order_id}`)} className="text-primary font-bold">
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
