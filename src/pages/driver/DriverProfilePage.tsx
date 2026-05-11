import { useEffect, useState } from 'react'
import { getDriver, updateDriverStatus } from '../../api/drivers'

interface Driver {
  driver_id: number
  name: string
  phone: string
  status: string
  points: number
  avg_rating: number | null
  total_ratings: number
}

export default function DriverProfilePage() {
  const driverId = Number(localStorage.getItem('driver_id'))
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [togglingStatus, setTogglingStatus] = useState(false)

  useEffect(() => {
    if (!driverId) return
    getDriver(driverId)
      .then(res => setDriver(res.data))
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [driverId])

  async function handleToggleStatus() {
    if (!driver) return
    const next = driver.status === 'available' ? 'busy' : 'available'
    setTogglingStatus(true)
    try {
      const res = await updateDriverStatus(driver.driver_id, next)
      setDriver(prev => prev ? { ...prev, status: res.data.status } : prev)
      localStorage.setItem('driverStatus', res.data.status)
    } catch {
      // silent — status stays as-is
    } finally {
      setTogglingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading profile...
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="flex items-center justify-center py-xxl text-red-500 gap-sm">
        <span className="material-symbols-outlined">error</span>
        {error || 'Driver not found.'}
      </div>
    )
  }

  const initial = driver.name.charAt(0).toUpperCase()
  const isAvailable = driver.status === 'available'

  return (
    <div className="max-w-2xl mx-auto space-y-xl">
      {/* Avatar + name card */}
      <div className="bg-[#F8F8F8] p-xl rounded-xl shadow-sm text-center">
        <div className="w-24 h-24 rounded-full mx-auto mb-md flex items-center justify-center bg-[#F97316] text-white text-4xl font-bold">
          {initial}
        </div>
        <h2 className="text-h2 font-h2">{driver.name}</h2>
        <p className="text-[#6B7280] text-sm mt-xs">Driver #{driver.driver_id}</p>
        <span className={`inline-block mt-sm px-3 py-1 rounded-full text-xs font-bold capitalize ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {driver.status}
        </span>
      </div>

      {/* Info card */}
      <div className="bg-[#F8F8F8] p-xl rounded-xl shadow-sm space-y-lg">
        <div className="flex justify-between border-b border-[#E5E5E5] pb-md">
          <span className="text-[#6B7280]">Phone</span>
          <span className="font-bold text-[#111111]">{driver.phone}</span>
        </div>
        <div className="flex justify-between border-b border-[#E5E5E5] pb-md">
          <span className="text-[#6B7280]">Driver ID</span>
          <span className="font-bold text-[#111111]">#{driver.driver_id}</span>
        </div>
        <div className="flex justify-between border-b border-[#E5E5E5] pb-md">
          <span className="text-[#6B7280]">Rating</span>
          <div className="flex items-center gap-xs">
            <span className="font-bold text-[#111111]">
              {driver.avg_rating !== null ? `${driver.avg_rating} / 5.0` : 'No ratings yet'}
            </span>
            {driver.avg_rating !== null && (
              <span className="material-symbols-outlined text-[#F97316] !text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Points</span>
          <span className="font-bold text-[#F97316]">{driver.points.toLocaleString()} pts</span>
        </div>
      </div>

      {/* Toggle availability */}
      <button
        onClick={handleToggleStatus}
        disabled={togglingStatus}
        className={`w-full py-md rounded-lg font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
          isAvailable
            ? 'bg-orange-500 text-white hover:brightness-105'
            : 'bg-green-600 text-white hover:brightness-105'
        }`}
      >
        {togglingStatus
          ? 'Updating...'
          : isAvailable
          ? 'Go Offline (Set Busy)'
          : 'Go Online (Set Available)'}
      </button>
    </div>
  )
}
