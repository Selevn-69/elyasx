import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrderById } from '../../api/orders'
import { checkRating, submitRating } from '../../api/ratings'

interface OrderDetail {
  order_id: number
  order_type: string
  status: string
  total_price: number
  created_at: string
  customer_name: string
  delivery: {
    driver_id: number | null
    driver_name: string | null
    driver_phone: string | null
    pickup_city: string | null
    pickup_street: string | null
    pickup_building: string | null
    dropoff_city: string | null
    dropoff_street: string | null
    dropoff_building: string | null
    delivery_status: string
  } | null
  payment: {
    payment_method: string
    payment_status: string
    amount: number
  } | null
  package: {
    description: string
    weight: number
    fragile: number
  } | null
  online_order: {
    store_name: string
    product_link: string | null
    notes: string | null
  } | null
  food_order: {
    restaurant_name: string
    items_description: string | null
  } | null
}

const STATUS_STEPS = ['pending', 'assigned', 'picked_up', 'on_the_way', 'delivered']
const STATUS_LABELS = ['Pending', 'Assigned', 'Picked Up', 'On the Way', 'Delivered']
const STATUS_ICONS = ['pending', 'person_pin', 'inventory_2', 'local_shipping', 'check_circle']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedRating, setSelectedRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [existingRating, setExistingRating] = useState<{ rating: number; comment: string | null } | null>(null)
  const [ratingChecked, setRatingChecked] = useState(false)
  const [submittingRating, setSubmittingRating] = useState(false)
  const ratingFetchedRef = useRef(false)

  useEffect(() => {
    if (!id) return

    getOrderById(Number(id))
      .then(res => setOrder(res.data))
      .catch(() => setError('Failed to load order.'))
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      getOrderById(Number(id))
        .then(res => setOrder(res.data))
        .catch(() => {})
    }, 5000)

    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    if (ratingFetchedRef.current) return
    if (order?.status !== 'delivered') return
    const driverId = order?.delivery?.driver_id
    const customerId = localStorage.getItem('customer_id')
    if (!driverId || !customerId) return

    ratingFetchedRef.current = true
    checkRating(driverId, Number(customerId))
      .then(res => {
        if (res.data.rated) setExistingRating(res.data.rating)
      })
      .finally(() => setRatingChecked(true))
  }, [order?.status, order?.delivery?.driver_id])

  async function handleSubmitRating() {
    const driverId = order?.delivery?.driver_id
    const customerId = localStorage.getItem('customer_id')
    if (!driverId || !customerId || selectedRating === 0) return

    setSubmittingRating(true)
    try {
      await submitRating(driverId, Number(customerId), selectedRating, ratingComment || undefined)
      setExistingRating({ rating: selectedRating, comment: ratingComment || null })
    } finally {
      setSubmittingRating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xxl gap-md text-secondary">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading order...
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center py-xxl text-red-500 gap-sm">
        <span className="material-symbols-outlined">error</span>
        {error || 'Order not found.'}
      </div>
    )
  }

  const currentStepIndex = order.status === 'cancelled' ? 0 : Math.max(STATUS_STEPS.indexOf(order.status), 0)
  const progressWidth = `${Math.min(currentStepIndex, STATUS_STEPS.length - 2) / (STATUS_STEPS.length - 2) * 100}%`

  const trackingSteps = STATUS_STEPS.map((_, i) => ({
    label: STATUS_LABELS[i],
    icon: i < currentStepIndex ? 'check' : STATUS_ICONS[i],
    isCurrent: i === currentStepIndex,
  }))

  const delivery = order.delivery

  let pickupText: string
  if (order.order_type === 'food' && order.food_order) {
    pickupText = order.food_order.restaurant_name
  } else if (order.order_type === 'online') {
    pickupText = 'ElyasX Fulfillment Center'
  } else if (delivery?.pickup_city) {
    pickupText = `${delivery.pickup_city}, ${delivery.pickup_street}${delivery.pickup_building ? `, ${delivery.pickup_building}` : ''}`
  } else {
    pickupText = 'Pending assignment'
  }

  const dropoffText = delivery?.dropoff_city
    ? `${delivery.dropoff_city}, ${delivery.dropoff_street}${delivery.dropoff_building ? `, ${delivery.dropoff_building}` : ''}`
    : 'Pending assignment'

  const showRating = order.status === 'delivered' && !!delivery?.driver_id && ratingChecked

  return (
    <div className="grid grid-cols-12 gap-gutter">
      <div className="col-span-12 lg:col-span-8 space-y-gutter">
        {/* Tracking progress */}
        <section className="bg-surface-container-lowest rounded-xl p-xl shadow-sm">
          {order.status === 'cancelled' ? (
            <div className="flex items-center justify-center gap-sm text-red-500 py-md">
              <span className="material-symbols-outlined">cancel</span>
              <span className="font-label-bold">This order has been cancelled.</span>
            </div>
          ) : (
            <div className="flex justify-between items-center relative">
              <div className="absolute top-5 left-8 right-8 h-1 bg-secondary-container z-0">
                <div className="h-full bg-primary-container transition-all" style={{ width: progressWidth }}></div>
              </div>
              {trackingSteps.map((step, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center gap-sm">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-primary-container text-white ${step.isCurrent ? 'scale-110 shadow-lg' : ''}`}>
                    <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
                  </div>
                  <span className="text-label-bold font-label-bold text-xs">{step.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Order type details */}
        {order.food_order && (
          <section className="bg-surface-container-lowest rounded-xl p-xl shadow-sm">
            <h5 className="text-label-bold uppercase mb-md">Food Order</h5>
            <p className="font-bold">{order.food_order.restaurant_name}</p>
            {order.food_order.items_description && (
              <p className="text-on-surface-variant">{order.food_order.items_description}</p>
            )}
          </section>
        )}
        {order.package && (
          <section className="bg-surface-container-lowest rounded-xl p-xl shadow-sm">
            <h5 className="text-label-bold uppercase mb-md">Package Details</h5>
            <p className="font-bold">{order.package.description}</p>
            <p className="text-on-surface-variant">{order.package.weight} kg{order.package.fragile ? ' • Fragile' : ''}</p>
          </section>
        )}
        {order.online_order && (
          <section className="bg-surface-container-lowest rounded-xl p-xl shadow-sm">
            <h5 className="text-label-bold uppercase mb-md">Online Order</h5>
            <p className="font-bold">{order.online_order.store_name}</p>
            {order.online_order.notes && (
              <p className="text-on-surface-variant">{order.online_order.notes}</p>
            )}
            {order.online_order.product_link && (
              <a href={order.online_order.product_link} target="_blank" rel="noreferrer" className="text-primary text-sm underline break-all">
                {order.online_order.product_link}
              </a>
            )}
          </section>
        )}

        {/* Pickup / Dropoff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-xl border-l-4 border-on-tertiary-container">
            <h5 className="text-label-bold uppercase mb-md">Pickup</h5>
            <p className="font-bold">{pickupText}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-xl border-l-4 border-primary">
            <h5 className="text-label-bold uppercase mb-md">Dropoff</h5>
            <p className="font-bold">{dropoffText}</p>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="relative w-full h-80 rounded-xl overflow-hidden shadow-sm">
          <img
            alt="Map"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbY3E518Xu_ggldoPdJkXBj9bUEO27CWzazLxBBNA3g_niaNitKgCLj-xh-23bXao8BTcm-nGLlFA6j6UxI_1WMvCnYGKa1nVNnJYo3La-5oF3KgXn8DS0917kHEJN_JNfDFn5RbMUe0z8p6XwaYSr96vQA2wnzEpNq4jIEvEvQzVdfawXdZG-OV8gEaOTWJ1zggmjQ-o0bInq3oumCxKhipILNR3A-nmQCEgg7CJy_HznQ_N489XSVflrJer3hN7NPEJmkJ7NBA"
          />
          <div className="absolute top-4 left-4 bg-white/90 px-md py-sm rounded-lg flex items-center gap-sm">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            <span className="text-label-bold">Order #{order.order_id}</span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="col-span-12 lg:col-span-4 space-y-gutter">
        {/* Driver card */}
        <section className="bg-surface-container-lowest rounded-xl p-xl shadow-sm">
          {delivery?.driver_name ? (
            <>
              <div className="flex items-center gap-md mb-xl">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[32px]">person</span>
                </div>
                <div>
                  <h4 className="font-bold">{delivery.driver_name}</h4>
                  <p className="text-primary text-xs">{delivery.driver_phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <a href={`tel:${delivery.driver_phone}`} className="bg-primary text-white py-md rounded-lg font-label-bold text-center">Call</a>
                <button className="bg-secondary-container py-md rounded-lg font-label-bold">Message</button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-md py-sm">
              <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px]">person_off</span>
              </div>
              <div>
                <h4 className="font-bold">No driver assigned</h4>
                <p className="text-on-surface-variant text-xs">We'll assign a driver soon</p>
              </div>
            </div>
          )}
        </section>

        {/* Payment summary */}
        {order.payment && (
          <section className="bg-surface-container-lowest rounded-xl p-xl shadow-sm">
            <h5 className="text-label-bold uppercase mb-md">Payment</h5>
            <div className="space-y-sm">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Amount</span>
                <span className="font-bold">₪{order.payment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Method</span>
                <span className="font-bold capitalize">{order.payment.payment_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Status</span>
                <span className={`font-bold capitalize ${order.payment.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {order.payment.payment_status}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Rating section */}
        {showRating && (
          <section className="bg-surface-container-lowest rounded-xl p-xl shadow-sm">
            {existingRating ? (
              <>
                <h5 className="text-label-bold uppercase mb-md">Your Rating</h5>
                <div className="flex gap-xs mb-sm">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span
                      key={s}
                      className={`material-symbols-outlined text-[24px] ${s <= existingRating.rating ? 'text-[#F97316]' : 'text-gray-300'}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >star</span>
                  ))}
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  You gave {delivery?.driver_name} {existingRating.rating}/5 stars.
                </p>
                {existingRating.comment && (
                  <p className="text-body-sm text-on-surface-variant mt-sm italic">"{existingRating.comment}"</p>
                )}
              </>
            ) : (
              <>
                <h5 className="text-label-bold uppercase mb-md">Rate Your Driver</h5>
                <p className="text-body-sm text-on-surface-variant mb-md">
                  How was your experience with {delivery?.driver_name}?
                </p>
                <div className="flex gap-xs mb-md">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span
                      key={s}
                      onClick={() => setSelectedRating(s)}
                      onMouseEnter={() => setHoveredStar(s)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className={`material-symbols-outlined text-[32px] cursor-pointer transition-colors select-none ${
                        s <= (hoveredStar || selectedRating) ? 'text-[#F97316]' : 'text-gray-300'
                      }`}
                      style={{ fontVariationSettings: `'FILL' ${s <= (hoveredStar || selectedRating) ? '1' : '0'}` }}
                    >star</span>
                  ))}
                </div>
                <textarea
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                  placeholder="Leave a comment (optional)"
                  className="w-full px-md py-sm bg-surface-container border border-outline-variant rounded-lg text-body-sm font-body-sm resize-none mb-md outline-none focus:border-primary transition-colors"
                  rows={2}
                />
                <button
                  onClick={handleSubmitRating}
                  disabled={selectedRating === 0 || submittingRating}
                  className="w-full py-sm bg-primary-container text-white font-label-bold rounded-lg disabled:opacity-50 hover:shadow-md transition-all"
                >
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
              </>
            )}
          </section>
        )}
      </aside>
    </div>
  )
}
