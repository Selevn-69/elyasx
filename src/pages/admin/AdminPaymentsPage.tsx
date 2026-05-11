import { useEffect, useState } from 'react'
import { getAllPayments } from '../../api/admin'

interface Payment {
  payment_id: number
  order_id: number
  amount: number
  payment_method: string
  payment_status: string
  order_type: string
  order_status: string
  customer_name: string
}

const statusClass: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
}

const FILTERS = ['All', 'completed', 'pending', 'failed']
const FILTER_LABELS: Record<string, string> = {
  All: 'All', completed: 'Completed', pending: 'Pending', failed: 'Failed',
}

function methodIcon(method: string): string {
  if (method === 'cash') return 'payments'
  return 'credit_card'
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  useEffect(() => {
    getAllPayments()
      .then(res => setPayments(res.data))
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

  const filtered = activeFilter === 'All' ? payments : payments.filter(p => p.payment_status === activeFilter)
  const totalRevenue = payments.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + p.amount * 0.20, 0)
  const pendingCount = payments.filter(p => p.payment_status === 'pending').length
  const failedCount = payments.filter(p => p.payment_status === 'failed').length

  return (
    <div className="p-margin max-w-max_width mx-auto w-full">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xxl">
        <div className="bg-primary-container p-lg rounded-xxl text-white flex flex-col justify-between shadow-[0_8px_30px_rgba(249,115,22,0.15)]">
          <div>
            <span className="material-symbols-outlined bg-white/20 p-sm rounded-lg mb-md block w-fit">payments</span>
            <p className="font-label-caps text-label-caps opacity-80 uppercase">Total Revenue</p>
            <h2 className="font-h2 text-h2 mt-xs">₪{totalRevenue.toFixed(2)}</h2>
          </div>
          <div className="flex items-center gap-xs mt-xl text-body-sm font-body-sm bg-white/10 w-fit px-md py-xs rounded-full">
            <span className="material-symbols-outlined !text-sm">trending_up</span>
            <span>From completed payments</span>
          </div>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Transactions</p>
          <p className="font-h2 text-h2 text-on-surface">{payments.length}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Pending</p>
          <p className="font-h2 text-h2 text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Failed</p>
          <p className="font-h2 text-h2 text-red-500">{failedCount}</p>
        </div>
      </section>

      <section className="bg-[#F8F8F8] rounded-xl shadow-ambient overflow-hidden border border-white/50">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/30 flex-wrap gap-sm">
          <h3 className="font-h3 text-h3 text-on-surface">Transaction History</h3>
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
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Payment ID</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Customer</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Order</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Method</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Status</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase text-right">Full Amount</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase text-right">Revenue (20%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.map(payment => (
                <tr
                  key={payment.payment_id}
                  onClick={() => setSelectedPayment(payment)}
                  className="hover:bg-surface-container-lowest/50 transition-colors cursor-pointer"
                >
                  <td className="px-lg py-lg font-label-bold text-primary">#{payment.payment_id}</td>
                  <td className="px-lg py-lg text-on-surface">{payment.customer_name}</td>
                  <td className="px-lg py-lg text-on-surface-variant">#{payment.order_id}</td>
                  <td className="px-lg py-lg">
                    <div className="flex items-center gap-sm text-on-surface capitalize">
                      <span className="material-symbols-outlined text-primary">{methodIcon(payment.payment_method)}</span>
                      {payment.payment_method.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-lg py-lg">
                    <span className={`px-3 py-1 rounded-full font-label-bold text-xs whitespace-nowrap ${statusClass[payment.payment_status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {formatStatus(payment.payment_status)}
                    </span>
                  </td>
                  <td className="px-lg py-lg font-label-bold text-right text-on-surface-variant">₪{payment.amount.toFixed(2)}</td>
                  <td className="px-lg py-lg font-label-bold text-right text-on-surface">₪{(payment.amount * 0.20).toFixed(2)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-lg py-xl text-center text-on-surface-variant">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-gutter" onClick={() => setSelectedPayment(null)}>
          <div className="bg-white rounded-xxl p-[24px] w-full max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.15)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-xl">
              <div>
                <span className="font-label-bold text-primary">#{selectedPayment.payment_id}</span>
                <h2 className="font-h3 text-h3 text-on-surface">Transaction Details</h2>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex items-center gap-lg mb-xl">
              <div className="w-16 h-16 rounded-xxl bg-surface-container-low flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary !text-[32px]">{methodIcon(selectedPayment.payment_method)}</span>
              </div>
              <div>
                <h3 className="font-h3 text-h3 text-on-surface">{selectedPayment.customer_name}</h3>
                <p className="text-body-sm text-on-surface-variant capitalize">{selectedPayment.payment_method.replace('_', ' ')}</p>
                <span className={`px-3 py-1 rounded-full font-label-bold text-xs mt-xs inline-block ${statusClass[selectedPayment.payment_status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {formatStatus(selectedPayment.payment_status)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-xl gap-y-md items-center border-t border-outline-variant/20 pt-lg">
              {[
                { label: 'Payment ID', value: `#${selectedPayment.payment_id}`, icon: 'tag' },
                { label: 'Customer', value: selectedPayment.customer_name, icon: 'person' },
                { label: 'Order Reference', value: `#${selectedPayment.order_id}`, icon: 'receipt_long' },
                { label: 'Order Type', value: selectedPayment.order_type, icon: 'category' },
                { label: 'Payment Method', value: selectedPayment.payment_method.replace('_', ' '), icon: methodIcon(selectedPayment.payment_method) },
                { label: 'Full Amount', value: `₪${selectedPayment.amount.toFixed(2)}`, icon: 'payments' },
                { label: 'Revenue (20%)', value: `₪${(selectedPayment.amount * 0.20).toFixed(2)}`, icon: 'account_balance' },
                { label: 'Order Status', value: formatStatus(selectedPayment.order_status), icon: 'local_shipping' },
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
          </div>
        </div>
      )}
    </div>
  )
}
