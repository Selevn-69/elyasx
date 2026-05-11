import { useEffect, useState } from 'react'
import { getTickets, createTicket } from '../../api/support'

interface Ticket {
  ticket_id: number
  issue_description: string
  status: string
  created_at?: string
  order_id: number | null
}

const ticketStatusClass: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [issueDescription, setIssueDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const customerId = Number(localStorage.getItem('customer_id'))

  useEffect(() => {
    getTickets(customerId)
      .then((res) => setTickets(res.data))
      .catch(() => {/* silently handle */})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!issueDescription.trim()) return
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await createTicket({ customer_id: customerId, issue_description: issueDescription })
      setTickets((prev) => [res.data, ...prev])
      setIssueDescription('')
    } catch {
      setSubmitError('Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      <div className="mb-xxl p-xl bg-primary-container rounded-xl text-white flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-h1 font-h1 mb-sm">How can we help?</h2>
          <p className="opacity-90 max-w-lg">Our team is ready to ensure your experience is seamless.</p>
        </div>
        <div className="relative z-10 bg-white/20 backdrop-blur-md p-lg rounded-xl border border-white/30 text-center">
          <span className="font-label-bold block mb-1">Avg Response</span>
          <p className="text-h3 font-h3">&lt; 15 Mins</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-xl">
        <div className="col-span-5 bg-surface-container-lowest p-xl rounded-xl shadow-sm">
          <h3 className="font-h3 mb-xl">New Ticket</h3>
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-md py-sm text-body-sm mb-md">
              {submitError}
            </div>
          )}
          <form className="space-y-md" onSubmit={handleSubmit}>
            <textarea
              className="w-full bg-surface border rounded-lg p-md outline-none focus:border-primary-container resize-none"
              rows={4}
              placeholder="Describe the issue..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-md bg-primary-container text-white font-label-bold rounded-lg shadow-lg disabled:opacity-60 hover:brightness-105 transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>

        <div className="col-span-7 bg-surface-container-lowest p-xl rounded-xl shadow-sm">
          <h3 className="font-h3 mb-xl">Active Tickets</h3>
          {loading ? (
            <div className="flex items-center justify-center py-xl gap-md text-secondary">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex items-center justify-center py-xl text-secondary">No tickets yet.</div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.ticket_id} className="p-lg bg-surface-container-low rounded-xl flex justify-between items-start gap-md">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-body-sm">#{ticket.ticket_id}</p>
                    <p className="text-xs text-on-surface-variant mt-xs truncate">{ticket.issue_description}</p>
                    {ticket.created_at && (
                      <p className="text-[10px] text-on-surface-variant mt-xs opacity-60">{formatDate(ticket.created_at)}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${ticketStatusClass[ticket.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
