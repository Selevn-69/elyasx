import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCustomerOrders } from '../../api/orders'

const services = [
  {
    title: 'Food Delivery',
    icon: 'restaurant',
    desc: 'Order from your favorite local restaurants with lightning speed.',
  },
  {
    title: 'Package Shipping',
    icon: 'local_shipping',
    desc: 'Send or receive parcels across the city with real-time tracking.',
  },
  {
    title: 'Online Order',
    icon: 'shopping_bag',
    desc: 'Groceries and essentials delivered to your door in under 30 mins.',
  },
]

const statusColors: Record<string, string> = {
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

export default function DashboardPage() {
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

  const activeOrder = orders.find((o) => o.status === 'assigned' || o.status === 'picked_up' || o.status === 'on_the_way')
  const recentOrders = orders.slice(0, 3)

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="grid grid-cols-12 gap-lg py-xl">
      {/* Active order banner */}
      {activeOrder && (
        <section className="col-span-12">
          <div className="bg-[#FFF7ED] border-l-8 border-primary-container rounded-xl p-lg flex flex-col md:flex-row items-center justify-between shadow-sm">
            <div className="flex items-center gap-lg">
              <div className="bg-primary-container/10 p-3 rounded-full text-primary-container">
                <span
                  className="material-symbols-outlined text-[32px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  delivery_dining
                </span>
              </div>
              <div>
                <p className="text-label-caps font-label-caps text-on-primary-container mb-1 uppercase tracking-wider">
                  Active Order #{activeOrder.order_id}
                </p>
                <h3 className="text-h3 font-h3 text-on-primary-container">
                  {activeOrder.status === 'on_the_way' ? 'Out for Delivery' : activeOrder.status === 'picked_up' ? 'Picked Up' : 'Assigned'}
                </h3>
                <p className="text-body-sm font-body-sm text-secondary">
                  {activeOrder.order_type} • ₪{activeOrder.total_price.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/orders/${activeOrder.order_id}`)}
              className="mt-md md:mt-0 bg-primary-container hover:bg-primary-container/90 text-white font-label-bold py-3 px-xl rounded-lg shadow-lg active:scale-95 transition-all"
            >
              Track Order
            </button>
          </div>
        </section>
      )}

      {/* Main content */}
      <section className="col-span-12 lg:col-span-9 space-y-lg">
        <div className="flex items-center justify-between">
          <h4 className="text-[26px] leading-tight font-h3 text-inverse-surface">Start a New Order</h4>
          <Link to="/new-order" className="text-primary font-label-bold hover:underline">
            View All Services
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-[#F8F8F8] rounded-xl p-lg flex flex-col h-full shadow-sm border border-transparent hover:border-primary-container/20 transition-all group"
            >
              <div className="bg-surface-container-lowest w-14 h-14 rounded-lg flex items-center justify-center mb-md group-hover:scale-110 transition-transform text-primary-container">
                <span className="material-symbols-outlined text-[28px]">{service.icon}</span>
              </div>
              <h5 className="text-body-lg font-h3 mb-sm">{service.title}</h5>
              <p className="text-body-sm font-body-sm text-secondary mb-xl flex-grow">{service.desc}</p>
              <button
                onClick={() => navigate('/new-order')}
                className="w-full bg-primary-container text-white font-label-bold py-3 rounded-lg hover:shadow-lg transition-all active:scale-95"
              >
                Order Now
              </button>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div className="pt-xl">
          <h4 className="text-[26px] leading-tight font-h3 text-inverse-surface mb-lg">Recent Orders</h4>
          <div className="bg-[#F8F8F8] rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-xl gap-md text-secondary">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Loading orders...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-xl text-red-500 gap-sm">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex items-center justify-center py-xl text-secondary">No orders yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30">
                    <th className="px-lg py-md text-label-caps font-label-caps text-secondary">Order ID</th>
                    <th className="px-lg py-md text-label-caps font-label-caps text-secondary">Type</th>
                    <th className="px-lg py-md text-label-caps font-label-caps text-secondary">Status</th>
                    <th className="px-lg py-md text-label-caps font-label-caps text-secondary">Price</th>
                    <th className="px-lg py-md text-label-caps font-label-caps text-secondary">Date</th>
                    <th className="px-lg py-md"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {recentOrders.map((ord) => (
                    <tr key={ord.order_id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-lg py-md font-label-bold text-on-surface">#{ord.order_id}</td>
                      <td className="px-lg py-md text-body-sm capitalize">{ord.order_type}</td>
                      <td className="px-lg py-md">
                        <span className={`px-3 py-1 rounded-full text-[12px] font-label-bold capitalize ${statusColors[ord.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {ord.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-lg py-md font-label-bold">₪{ord.total_price.toFixed(2)}</td>
                      <td className="px-lg py-md text-body-sm text-secondary">{formatDate(ord.created_at)}</td>
                      <td className="px-lg py-md text-right">
                        <Link to={`/orders/${ord.order_id}`} className="text-primary font-label-bold hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* Sidebar widgets */}
      <aside className="col-span-12 lg:col-span-3 space-y-lg">
        <div className="bg-[#F8F8F8] rounded-xl p-lg shadow-sm">
          <h4 className="text-[16px] leading-tight font-label-bold text-inverse-surface mb-lg">Quick Stats</h4>
          <div className="space-y-md">
            <div className="flex items-center justify-between p-md bg-surface-container-lowest rounded-lg border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary">analytics</span>
              <span className="text-h3 font-h3">{orders.length}</span>
            </div>
            <div className="flex items-center justify-between p-md bg-surface-container-lowest rounded-lg border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary-container">pending_actions</span>
              <span className="text-h3 font-h3">{orders.filter(o => o.status === 'pending' || o.status === 'assigned' || o.status === 'picked_up' || o.status === 'on_the_way').length}</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden aspect-[4/5] shadow-lg group">
          <img
            alt="Promo"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ8M1dgFqWax8PXv8f-LeVPkQyy_Hi4Qt6oBRlB37R-9gyimaqa_SbtJMoreV0OmV2viIuvDlgJ4_XcDhuizyl0nhqwxuX1pXcrT-y-AG30_Y8og9MaRZVdl1WEQeDi409trQDEYuGziNJgY1me_m-fWYoisHjNSRYVQo-7GAP6PQuCQwWGJ3fXhB2Ay1qBqr87PxZD7XVHTFumQHE6wrUXx1q8xBX5DYFgjkfwaORXLCopgTdHzmeiVm2JJoqsDG0e3dC97VcEg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end p-lg text-white">
            <p className="text-label-caps font-label-caps mb-xs">Limited Offer</p>
            <h4 className="text-h3 font-h3 leading-tight mb-md">Get 20% off your next 5 deliveries</h4>
            <button className="bg-white text-primary font-label-bold py-2 px-md rounded-lg text-sm w-fit">
              Claim Code
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
