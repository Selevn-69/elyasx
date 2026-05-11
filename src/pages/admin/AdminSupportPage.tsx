import { useEffect, useState } from 'react'
import { getAllTickets, updateTicketStatus } from '../../api/admin'

interface Ticket {
  ticket_id: number
  customer_id: number
  order_id: number | null
  issue_description: string
  status: string
  customer_name: string
}

const statusClass: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

const FILTERS = ['All', 'open', 'in_progress', 'resolved']
const FILTER_LABELS: Record<string, string> = {
  All: 'All', open: 'Open', in_progress: 'In Progress', resolved: 'Resolved',
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    getAllTickets()
      .then(res => setTickets(res.data))
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusUpdate(ticketId: number, status: string) {
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(ticketId, status)
      const res = await getAllTickets()
      setTickets(res.data)
      const updated = res.data.find((t: Ticket) => t.ticket_id === ticketId)
      setSelectedTicket(updated ?? null)
    } finally {
      setUpdatingStatus(false)
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

  const filtered = activeFilter === 'All' ? tickets : tickets.filter(t => t.status === activeFilter)
  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length

  return (
    <div className="p-margin max-w-max_width mx-auto w-full">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xxl">
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Total Tickets</p>
          <p className="font-h2 text-h2 text-on-surface">{tickets.length}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Open</p>
          <p className="font-h2 text-h2 text-yellow-600">{openCount}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">In Progress</p>
          <p className="font-h2 text-h2 text-blue-600">{inProgressCount}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Resolved</p>
          <p className="font-h2 text-h2 text-green-600">{resolvedCount}</p>
        </div>
      </section>

      <section className="bg-[#F8F8F8] rounded-xl shadow-ambient overflow-hidden border border-white/50">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/30 flex-wrap gap-sm">
          <h3 className="font-h3 text-h3 text-on-surface">Support Tickets</h3>
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
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Ticket ID</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Customer</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Issue</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Order</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Status</th>
                <th className="px-lg py-md"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.map(ticket => (
                <tr key={ticket.ticket_id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-lg py-lg font-label-bold text-primary">#{ticket.ticket_id}</td>
                  <td className="px-lg py-lg text-on-surface">{ticket.customer_name}</td>
                  <td className="px-lg py-lg text-on-surface max-w-[200px] truncate">{ticket.issue_description}</td>
                  <td className="px-lg py-lg text-on-surface-variant">{ticket.order_id ? `#${ticket.order_id}` : '—'}</td>
                  <td className="px-lg py-lg">
                    <span className={`px-3 py-1 rounded-full font-label-bold text-xs whitespace-nowrap ${statusClass[ticket.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {formatStatus(ticket.status)}
                    </span>
                  </td>
                  <td className="px-lg py-lg">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-primary font-label-bold hover:underline text-label-bold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-lg py-xl text-center text-on-surface-variant">No tickets found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-gutter" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-xxl p-[24px] w-full max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.15)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-lg">
              <div>
                <span className="font-label-bold text-primary">#{selectedTicket.ticket_id}</span>
                <h2 className="font-h3 text-h3 text-on-surface">Support Ticket</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0 ml-md">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mb-lg">
              <span className={`px-3 py-1 rounded-full font-label-bold text-xs ${statusClass[selectedTicket.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {formatStatus(selectedTicket.status)}
              </span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-xl gap-y-md items-center border-t border-outline-variant/20 pt-lg mb-xl">
              {[
                { label: 'Customer', value: selectedTicket.customer_name, icon: 'person' },
                { label: 'Order', value: selectedTicket.order_id ? `#${selectedTicket.order_id}` : 'N/A', icon: 'receipt_long' },
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
            <div className="bg-surface-container-low rounded-xl p-lg mb-xl">
              <p className="font-label-bold text-label-bold text-on-surface-variant mb-sm">Issue Description</p>
              <p className="text-body-md text-on-surface">{selectedTicket.issue_description}</p>
            </div>
            {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
              <div className="flex gap-sm">
                {selectedTicket.status === 'open' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedTicket.ticket_id, 'in_progress')}
                    disabled={updatingStatus}
                    className="flex-1 py-md bg-surface-container border border-outline-variant text-on-surface font-label-bold rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-50"
                  >
                    {updatingStatus ? 'Updating...' : 'Mark In Progress'}
                  </button>
                )}
                <button
                  onClick={() => handleStatusUpdate(selectedTicket.ticket_id, 'resolved')}
                  disabled={updatingStatus}
                  className="flex-1 py-md bg-primary-container text-white font-label-bold rounded-lg hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {updatingStatus ? 'Updating...' : 'Mark Resolved'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
