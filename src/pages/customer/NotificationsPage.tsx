import { useEffect, useState } from 'react'
import { getNotifications, markAsRead } from '../../api/notifications'

interface Notification {
  notification_id: number
  message: string
  status: 'read' | 'unread'
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const customerId = Number(localStorage.getItem('customer_id'))

  useEffect(() => {
    getNotifications(customerId)
      .then((res) => setNotifications(res.data))
      .catch(() => setError('Failed to load notifications.'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleMarkRead(id: number) {
    try {
      await markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, status: 'read' } : n))
      )
    } catch {
      // silently ignore
    }
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => n.status === 'unread')
    await Promise.all(unread.map((n) => markAsRead(n.notification_id)))
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })))
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins} MINS AGO`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} HOURS AGO`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading notifications...
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

  return (
    <>
      <div className="flex justify-between items-end mb-xl">
        <h3 className="font-h3">Recent Updates</h3>
        <button onClick={handleMarkAllRead} className="text-xs font-bold text-primary">Mark All as Read</button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex items-center justify-center py-xxl text-secondary">No notifications yet.</div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => {
            const unread = notif.status === 'unread'
            return (
              <div
                key={notif.notification_id}
                onClick={() => unread && handleMarkRead(notif.notification_id)}
                className={`flex items-start gap-lg p-lg rounded-xl border-l-4 transition-all cursor-pointer ${
                  unread
                    ? 'bg-[#FFF7ED] border-primary shadow-sm'
                    : 'bg-surface-container-lowest border-transparent hover:bg-surface-container-low'
                }`}
              >
                <div className="mt-1 flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      unread
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-variant/30 text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {unread ? 'local_shipping' : 'check_circle'}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-xs">
                    <span className="text-[10px] opacity-60 uppercase">{formatTime(notif.created_at)}</span>
                  </div>
                  <p className="text-body-md text-on-surface-variant">{notif.message}</p>
                </div>
                {unread && <div className="w-3 h-3 bg-primary rounded-full mt-1"></div>}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
