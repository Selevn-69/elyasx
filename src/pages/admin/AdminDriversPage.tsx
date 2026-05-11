import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { getAllDrivers, getDriverPendingPayments, settleDriverPayments, addDriverPoints } from '../../api/admin'
import { getDriverRatings } from '../../api/ratings'

interface Driver {
  driver_id: number
  name: string
  phone: string
  status: string
  points: number
  avg_rating: number | null
  total_ratings: number
  total_deliveries: number
}

const statusClass: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  busy: 'bg-orange-100 text-orange-700',
}

const FILTERS = ['All', 'available', 'busy']
const FILTER_LABELS: Record<string, string> = { All: 'All', available: 'Available', busy: 'Busy' }

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [driverRatings, setDriverRatings] = useState<{ rating_id: number; rating: number; comment: string | null; customer_name: string }[]>([])
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [paymentSummary, setPaymentSummary] = useState<{ total_collected: number; company_share: number; count: number } | null>(null)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [settlingAction, setSettlingAction] = useState<'completed' | 'failed' | null>(null)
  const [pointsInput, setPointsInput] = useState('')
  const [pointsSubmitting, setPointsSubmitting] = useState(false)
  const [pointsError, setPointsError] = useState('')

  useEffect(() => {
    getAllDrivers()
      .then(res => setDrivers(res.data))
      .finally(() => setLoading(false))
  }, [])

  async function handleAddPoints() {
    const pts = parseInt(pointsInput)
    if (!pointsInput || isNaN(pts) || pts === 0) {
      setPointsError('Enter a non-zero number of points.')
      return
    }
    setPointsError('')
    setPointsSubmitting(true)
    try {
      const res = await addDriverPoints(selectedDriver!.driver_id, pts)
      setSelectedDriver(prev => prev ? { ...prev, points: res.data.points } : prev)
      setDrivers(prev => prev.map(d =>
        d.driver_id === selectedDriver!.driver_id ? { ...d, points: res.data.points } : d
      ))
      setPointsInput('')
    } catch (err) {
      setPointsError(isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to update points.') : 'Failed to update points.')
    } finally {
      setPointsSubmitting(false)
    }
  }

  async function handleViewDriver(driver: Driver) {
    setSelectedDriver(driver)
    setDriverRatings([])
    setPaymentSummary(null)
    setRatingsLoading(true)
    setPaymentsLoading(true)
    setPointsInput('')
    setPointsError('')
    try {
      const [ratingsRes, paymentsRes] = await Promise.all([
        getDriverRatings(driver.driver_id),
        getDriverPendingPayments(driver.driver_id),
      ])
      setDriverRatings(ratingsRes.data.ratings)
      setPaymentSummary({
        total_collected: paymentsRes.data.total_collected,
        company_share: paymentsRes.data.company_share,
        count: paymentsRes.data.count,
      })
    } finally {
      setRatingsLoading(false)
      setPaymentsLoading(false)
    }
  }

  async function handleSettlePayments(action: 'completed' | 'failed') {
    if (!selectedDriver) return
    setSettlingAction(action)
    try {
      await settleDriverPayments(selectedDriver.driver_id, action)
      setPaymentSummary({ total_collected: 0, company_share: 0, count: 0 })
    } finally {
      setSettlingAction(null)
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

  const filtered = drivers.filter(d => {
    const matchFilter = activeFilter === 'All' || d.status === activeFilter
    const matchSearch = search === '' ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search)
    return matchFilter && matchSearch
  })

  const availableCount = drivers.filter(d => d.status === 'available').length
  const busyCount = drivers.filter(d => d.status === 'busy').length
  const ratedDrivers = drivers.filter(d => d.avg_rating !== null)
  const avgRating = ratedDrivers.length > 0
    ? (ratedDrivers.reduce((sum, d) => sum + (d.avg_rating as number), 0) / ratedDrivers.length).toFixed(1)
    : '—'

  return (
    <div className="p-margin max-w-max_width mx-auto w-full">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xxl">
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Total Drivers</p>
          <p className="font-h2 text-h2 text-on-surface">{drivers.length}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Available</p>
          <p className="font-h2 text-h2 text-green-600">{availableCount}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Busy</p>
          <p className="font-h2 text-h2 text-orange-600">{busyCount}</p>
        </div>
        <div className="bg-[#F8F8F8] p-lg rounded-xl shadow-ambient border border-white/50">
          <p className="font-label-bold text-label-bold text-on-surface-variant mb-xs">Avg. Rating</p>
          <div className="flex items-center gap-xs">
            <p className="font-h2 text-h2 text-on-surface">{avgRating}</p>
            {avgRating !== '—' && (
              <span className="material-symbols-outlined text-[#F97316]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#F8F8F8] rounded-xl shadow-ambient overflow-hidden border border-white/50">
        <div className="px-lg py-md border-b border-outline-variant/30 space-y-sm">
          <div className="flex items-center justify-between flex-wrap gap-sm">
            <h3 className="font-h3 text-h3 text-on-surface">Driver Roster</h3>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
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
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Driver</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Phone</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Status</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase">Rating</th>
                <th className="px-lg py-md font-label-bold text-label-bold text-on-surface-variant/60 uppercase text-right">Deliveries</th>
                <th className="px-lg py-md"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.map(driver => (
                <tr key={driver.driver_id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-lg py-lg">
                    <div className="flex items-center gap-sm">
                      <div className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center text-white font-label-bold text-xs shrink-0">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-label-bold text-on-surface">{driver.name}</p>
                        <p className="text-body-sm text-on-surface-variant/60">ID #{driver.driver_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-lg text-on-surface-variant">{driver.phone}</td>
                  <td className="px-lg py-lg">
                    <span className={`px-3 py-1 rounded-full font-label-bold text-xs capitalize ${statusClass[driver.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {driver.status}
                    </span>
                  </td>
                  <td className="px-lg py-lg">
                    <div className="flex items-center gap-xs">
                      <span className="font-label-bold text-on-surface">{driver.avg_rating ?? '—'}</span>
                      {driver.avg_rating !== null && (
                        <span className="material-symbols-outlined text-[#F97316] !text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      )}
                    </div>
                  </td>
                  <td className="px-lg py-lg font-label-bold text-right text-on-surface">{driver.total_deliveries}</td>
                  <td className="px-lg py-lg">
                    <button onClick={() => handleViewDriver(driver)} className="text-primary font-label-bold hover:underline text-label-bold">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-lg py-xl text-center text-on-surface-variant">No drivers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedDriver && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-gutter" onClick={() => setSelectedDriver(null)}>
          <div className="bg-white rounded-xxl p-[24px] w-full max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-xl">
              <h2 className="font-h3 text-h3 text-on-surface">Driver Details</h2>
              <button onClick={() => setSelectedDriver(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex items-center gap-lg mb-xl">
              <div className="w-16 h-16 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold text-2xl shrink-0">
                {selectedDriver.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-h3 text-h3 text-on-surface">{selectedDriver.name}</h3>
                <p className="text-body-sm text-on-surface-variant">ID #{selectedDriver.driver_id}</p>
                <span className={`px-3 py-1 rounded-full font-label-bold text-xs mt-xs inline-block capitalize ${statusClass[selectedDriver.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {selectedDriver.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-xl gap-y-md items-center border-t border-outline-variant/20 pt-lg">
              {[
                { label: 'Phone', value: selectedDriver.phone, icon: 'phone' },
                {
                  label: 'Rating',
                  value: selectedDriver.avg_rating !== null
                    ? `${selectedDriver.avg_rating} / 5.0 (${selectedDriver.total_ratings} ratings)`
                    : 'No ratings yet',
                  icon: 'star',
                },
                { label: 'Total Deliveries', value: String(selectedDriver.total_deliveries), icon: 'local_shipping' },
                { label: 'Points', value: `${selectedDriver.points.toLocaleString()} pts`, icon: 'loyalty' },
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

            {/* Pending payments section */}
            <div className="mt-xl border-t border-outline-variant/20 pt-lg">
              <p className="font-label-bold text-label-bold text-on-surface-variant mb-md">Cash Payment Settlement</p>
              {paymentsLoading ? (
                <div className="flex items-center gap-sm text-secondary py-sm">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span className="text-body-sm">Loading...</span>
                </div>
              ) : paymentSummary && paymentSummary.count > 0 ? (
                <div className="space-y-md">
                  <div className="grid grid-cols-3 gap-sm">
                    <div className="bg-surface-container-low rounded-lg px-md py-sm text-center">
                      <p className="text-body-sm text-on-surface-variant mb-xs">Orders</p>
                      <p className="font-label-bold text-on-surface">{paymentSummary.count}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg px-md py-sm text-center">
                      <p className="text-body-sm text-on-surface-variant mb-xs">Collected</p>
                      <p className="font-label-bold text-on-surface">₪{paymentSummary.total_collected.toFixed(2)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg px-md py-sm text-center border border-orange-200">
                      <p className="text-body-sm text-orange-600 mb-xs">Owed (20%)</p>
                      <p className="font-label-bold text-[#F97316]">₪{paymentSummary.company_share.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-sm">
                    <button
                      onClick={() => handleSettlePayments('completed')}
                      disabled={settlingAction !== null}
                      className="flex items-center justify-center gap-xs py-sm bg-green-600 text-white font-label-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 text-body-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {settlingAction === 'completed' ? 'Confirming...' : 'Confirm Payment Received'}
                    </button>
                    <button
                      onClick={() => handleSettlePayments('failed')}
                      disabled={settlingAction !== null}
                      className="flex items-center justify-center gap-xs py-sm bg-surface-container border border-outline-variant text-on-surface font-label-bold rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-60 text-body-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {settlingAction === 'failed' ? 'Marking...' : 'Late for Payment'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-body-sm text-on-surface-variant">No pending payments.</p>
              )}
            </div>

            {/* Ratings list */}
            <div className="mt-xl border-t border-outline-variant/20 pt-lg">
              <p className="font-label-bold text-label-bold text-on-surface-variant mb-md">Recent Reviews</p>
              {ratingsLoading ? (
                <div className="flex items-center gap-sm text-secondary py-sm">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span className="text-body-sm">Loading...</span>
                </div>
              ) : driverRatings.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No reviews yet.</p>
              ) : (
                <div className="space-y-sm max-h-48 overflow-y-auto">
                  {driverRatings.map(r => (
                    <div key={r.rating_id} className="bg-surface-container-low rounded-lg px-md py-sm">
                      <div className="flex items-center justify-between mb-xs">
                        <span className="font-label-bold text-on-surface text-body-sm">{r.customer_name}</span>
                        <div className="flex gap-xs">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span
                              key={s}
                              className={`material-symbols-outlined !text-sm ${s <= r.rating ? 'text-[#F97316]' : 'text-gray-300'}`}
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >star</span>
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-body-sm text-on-surface-variant italic">"{r.comment}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adjust points */}
            <div className="mt-xl border-t border-outline-variant/20 pt-lg">
              <p className="font-label-bold text-label-bold text-on-surface-variant mb-sm">Adjust Points</p>
              <div className="flex items-center gap-sm">
                <div className="flex items-center gap-xs bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm flex-1">
                  <span className="material-symbols-outlined text-primary !text-[18px]">loyalty</span>
                  <span className="text-body-sm text-on-surface-variant font-label-bold">Current:</span>
                  <span className="font-label-bold text-on-surface">{selectedDriver.points}</span>
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
          </div>
        </div>
      )}
    </div>
  )
}
