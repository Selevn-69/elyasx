import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { getAllCustomers, getCustomerById, addCustomerPoints } from '../../api/admin'

interface Customer {
  customer_id: number
  name: string
  phone: string
  email: string
  points: number
  total_orders: number
}

interface Address {
  address_id: number
  city: string
  street: string
  building: string | null
  notes: string | null
}

interface OrderItem {
  order_id: number
  order_type: string
  status: string
  total_price: number
  created_at: string
}

interface CustomerDetail extends Customer {
  addresses: Address[]
  orders: OrderItem[]
}

const statusClass: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-purple-100 text-purple-700',
  on_the_way: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [pointsInput, setPointsInput] = useState('')
  const [pointsSubmitting, setPointsSubmitting] = useState(false)
  const [pointsError, setPointsError] = useState('')

  useEffect(() => {
    getAllCustomers()
      .then(res => setCustomers(res.data))
      .finally(() => setLoading(false))
  }, [])

  async function handleViewCustomer(id: number) {
    setSelectedCustomer(null)
    setModalLoading(true)
    setPointsInput('')
    setPointsError('')
    try {
      const res = await getCustomerById(id)
      setSelectedCustomer(res.data)
    } finally {
      setModalLoading(false)
    }
  }

  async function handleAddPoints() {
    const pts = parseInt(pointsInput)
    if (!pointsInput || isNaN(pts) || pts === 0) {
      setPointsError('Enter a non-zero number of points.')
      return
    }
    setPointsError('')
    setPointsSubmitting(true)
    try {
      const res = await addCustomerPoints(selectedCustomer!.customer_id, pts)
      setSelectedCustomer(prev => prev ? { ...prev, points: res.data.points } : prev)
      setCustomers(prev => prev.map(c =>
        c.customer_id === selectedCustomer!.customer_id ? { ...c, points: res.data.points } : c
      ))
      setPointsInput('')
    } catch (err) {
      setPointsError(isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to update points.') : 'Failed to update points.')
    } finally {
      setPointsSubmitting(false)
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

  const filtered = customers.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const totalOrdersAll = customers.reduce((sum, c) => sum + c.total_orders, 0)
  const avgOrders = customers.length > 0 ? (totalOrdersAll / customers.length).toFixed(1) : '0'

  return (
    <div className="p-margin max-w-max_width mx-auto w-full">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xxl">
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Total Customers</p>
          <p className="font-h2 text-h2 text-on-surface">{customers.length}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Total Orders Placed</p>
          <p className="font-h2 text-h2 text-on-surface">{totalOrdersAll}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Avg Orders / Customer</p>
          <p className="font-h2 text-h2 text-on-surface">{avgOrders}</p>
        </div>
      </section>

      <section className="bg-[#F8F8F8] rounded-xl shadow-ambient overflow-hidden border border-white/50">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/30 flex-wrap gap-sm">
          <h3 className="font-h3 text-h3 text-on-surface">All Customers</h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="px-md py-xs bg-white border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline-variant w-72 outline-none focus:border-primary"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Customer</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Email</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Phone</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase text-right">Orders</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase text-right">Points</th>
                <th className="px-lg py-md"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.map(customer => (
                <tr key={customer.customer_id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-lg py-lg">
                    <div className="flex items-center gap-sm">
                      <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-label-bold text-on-surface text-xs shrink-0">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-label-bold text-on-surface">{customer.name}</p>
                        <p className="text-body-sm text-on-surface-variant/60">ID #{customer.customer_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-lg text-on-surface-variant">{customer.email}</td>
                  <td className="px-lg py-lg text-on-surface-variant">{customer.phone}</td>
                  <td className="px-lg py-lg font-label-bold text-right text-on-surface">{customer.total_orders}</td>
                  <td className="px-lg py-lg font-label-bold text-right text-primary">{customer.points}</td>
                  <td className="px-lg py-lg">
                    <button
                      onClick={() => handleViewCustomer(customer.customer_id)}
                      className="text-primary font-label-bold hover:underline text-label-bold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-lg py-xl text-center text-on-surface-variant">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(selectedCustomer !== null || modalLoading) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-gutter" onClick={() => { setSelectedCustomer(null); setModalLoading(false) }}>
          <div className="bg-white rounded-xxl p-[24px] w-full max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {modalLoading || !selectedCustomer ? (
              <div className="flex items-center justify-center py-xl gap-md text-secondary">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Loading...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-xl">
                  <h2 className="font-h3 text-h3 text-on-surface">Customer Details</h2>
                  <button onClick={() => setSelectedCustomer(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="flex items-center gap-lg mb-xl">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-2xl text-on-surface shrink-0">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-h3 text-h3 text-on-surface">{selectedCustomer.name}</h3>
                    <p className="text-body-sm text-on-surface-variant">ID #{selectedCustomer.customer_id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-xl gap-y-md items-center border-t border-outline-variant/20 pt-lg mb-xl">
                  {[
                    { label: 'Email', value: selectedCustomer.email, icon: 'email' },
                    { label: 'Phone', value: selectedCustomer.phone, icon: 'phone' },
                    { label: 'Total Orders', value: String(selectedCustomer.orders.length), icon: 'receipt_long' },
                    { label: 'Points', value: String(selectedCustomer.points), icon: 'loyalty' },
                  ].map(row => (
                    <>
                      <div key={`label-${row.label}`} className="flex items-center gap-sm text-on-surface-variant whitespace-nowrap">
                        <span className="material-symbols-outlined text-primary !text-[18px]">{row.icon}</span>
                        <span className="text-body-sm font-label-bold">{row.label}</span>
                      </div>
                      <p key={`value-${row.label}`} className="font-label-bold text-on-surface text-body-sm">{row.value}</p>
                    </>
                  ))}
                </div>
                {selectedCustomer.addresses.length > 0 && (
                  <div className="mb-xl">
                    <p className="font-label-bold text-label-bold text-on-surface-variant mb-sm">Addresses</p>
                    <div className="space-y-xs">
                      {selectedCustomer.addresses.map(a => (
                        <div key={a.address_id} className="bg-surface-container-low rounded-lg px-md py-sm text-body-sm text-on-surface">
                          {a.city}, {a.street}{a.building ? `, ${a.building}` : ''}{a.notes ? ` — ${a.notes}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCustomer.orders.length > 0 && (
                  <div className="mb-xl">
                    <p className="font-label-bold text-label-bold text-on-surface-variant mb-sm">Recent Orders</p>
                    <div className="space-y-xs">
                      {selectedCustomer.orders.slice(0, 5).map(o => (
                        <div key={o.order_id} className="bg-surface-container-low rounded-lg px-md py-sm flex items-center justify-between gap-sm text-body-sm">
                          <span className="font-label-bold text-on-surface capitalize">#{o.order_id} — {o.order_type}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-label-bold whitespace-nowrap ${statusClass[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {formatStatus(o.status)}
                          </span>
                          <span className="font-label-bold text-primary">₪{o.total_price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-outline-variant/20 pt-lg">
                  <p className="font-label-bold text-label-bold text-on-surface-variant mb-sm">Adjust Points</p>
                  <div className="flex items-center gap-sm">
                    <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm flex-1">
                      <span className="material-symbols-outlined text-primary !text-[18px]">loyalty</span>
                      <span className="text-body-sm text-on-surface-variant font-label-bold">Current:</span>
                      <span className="font-label-bold text-on-surface">{selectedCustomer.points}</span>
                    </div>
                    <input
                      type="number"
                      value={pointsInput}
                      onChange={e => { setPointsInput(e.target.value); setPointsError('') }}
                      placeholder="e.g. 50 or -10"
                      className="w-36 px-md py-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline-variant outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleAddPoints}
                      disabled={pointsSubmitting}
                      className="px-md py-sm font-label-bold text-label-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {pointsSubmitting ? 'Saving...' : 'Add Points'}
                    </button>
                  </div>
                  {pointsError && (
                    <p className="mt-xs text-error text-body-sm font-label-bold">{pointsError}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
