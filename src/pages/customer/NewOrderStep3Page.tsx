import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { createOrder } from '../../api/orders'
import api from '../../api/axios'

export default function NewOrderStep3Page() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [availablePoints, setAvailablePoints] = useState(0)
  const [pointsInput, setPointsInput] = useState('')
  const [usePoints, setUsePoints] = useState(false)

  const orderType = sessionStorage.getItem('newOrderType') || 'food'
  const details = JSON.parse(sessionStorage.getItem('newOrderDetails') || '{}')
  const deliveryFee: number = details.total_price ?? 10.00
  const customerId = Number(localStorage.getItem('customer_id'))

  useEffect(() => {
    if (!customerId) return
    api.get(`/customers/${customerId}`)
      .then(res => setAvailablePoints(res.data.points ?? 0))
      .catch(() => {})
  }, [customerId])

  const maxUsablePoints = Math.min(availablePoints, Math.floor(deliveryFee * 10))
  const pointsToUse = usePoints ? Math.min(Math.max(0, parseInt(pointsInput) || 0), maxUsablePoints) : 0
  const discount = pointsToUse / 10
  const finalTotal = Math.max(0, deliveryFee - discount)

  async function handlePlaceOrder() {
    setError('')
    setSubmitting(true)
    try {
      const res = await createOrder({
        customer_id: customerId,
        order_type: orderType,
        payment_method: 'cash',
        points_to_use: pointsToUse,
        ...details,
      })
      sessionStorage.removeItem('newOrderType')
      sessionStorage.removeItem('newOrderDetails')
      navigate(`/orders/${res.data.order_id}`)
    } catch (err) {
      setError(isAxiosError(err) ? (err.response?.data?.detail ?? 'Failed to place order. Please try again.') : 'Failed to place order. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-gutter">
      <div className="col-span-12 lg:col-span-7 space-y-gutter">
        <h2 className="font-h2 text-[34px] leading-tight text-inverse-surface">Choose Payment Method</h2>
        <div className="space-y-md">
          {/* Cash on Delivery */}
          <label className="flex items-center justify-between p-lg bg-surface-container-lowest border-2 border-primary-container rounded-xl shadow-sm cursor-pointer">
            <div className="flex items-center gap-lg">
              <div className="w-14 h-14 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[32px]">payments</span>
              </div>
              <div>
                <h4 className="font-label-bold text-body-lg">Cash on Delivery</h4>
                <p className="text-body-sm">Pay when your order arrives</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </label>

          {/* Pay with Card — disabled */}
          <label className="flex items-center justify-between p-lg bg-surface-container-lowest border-2 border-transparent rounded-xl shadow-sm opacity-50 cursor-not-allowed pointer-events-none select-none">
            <div className="flex items-center gap-lg">
              <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px]">credit_card</span>
              </div>
              <div>
                <h4 className="font-label-bold text-body-lg">Pay with Card</h4>
                <p className="text-body-sm">Coming soon</p>
              </div>
            </div>
            <span className="material-symbols-outlined">radio_button_unchecked</span>
          </label>

          {/* Use Points */}
          {availablePoints > 0 && (
            <div className="bg-surface-container-lowest border-2 border-transparent rounded-xl shadow-sm p-lg space-y-md">
              <label className="flex items-center justify-between cursor-pointer" onClick={() => { setUsePoints(p => !p); setPointsInput('') }}>
                <div className="flex items-center gap-lg">
                  <div className="w-14 h-14 rounded-lg bg-[#FFF7ED] flex items-center justify-center text-[#F97316]">
                    <span className="material-symbols-outlined text-[32px]">loyalty</span>
                  </div>
                  <div>
                    <h4 className="font-label-bold text-body-lg">Use My Points</h4>
                    <p className="text-body-sm text-on-surface-variant">
                      You have <span className="font-bold text-[#F97316]">{availablePoints} pts</span> — worth up to <span className="font-bold text-[#F97316]">₪{(availablePoints / 10).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <span
                  className={`material-symbols-outlined transition-colors ${usePoints ? 'text-primary' : 'text-outline-variant'}`}
                  style={usePoints ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {usePoints ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </label>

              {usePoints && (
                <div className="space-y-sm pt-sm border-t border-outline-variant/20">
                  <div className="flex items-center gap-sm">
                    <div className="flex-1">
                      <label className="text-body-sm font-label-bold text-on-surface-variant mb-xs block">
                        Points to use (max {maxUsablePoints})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={maxUsablePoints}
                        value={pointsInput}
                        onChange={e => setPointsInput(e.target.value)}
                        placeholder={`0 – ${maxUsablePoints}`}
                        className="w-full px-md py-sm border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface outline-none focus:border-primary bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPointsInput(String(maxUsablePoints))}
                      className="mt-5 px-md py-sm text-body-sm font-label-bold text-primary border border-primary rounded-lg hover:bg-[#FFF7ED] transition-colors whitespace-nowrap"
                    >
                      Use Max
                    </button>
                  </div>
                  {pointsToUse > 0 && (
                    <p className="text-body-sm text-green-700 font-label-bold">
                      Using {pointsToUse} pts → ₪{discount.toFixed(2)} discount
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5">
        <div className="bg-surface-container-lowest rounded-xl p-xl shadow-sm border">
          <h3 className="font-h3 text-[26px] leading-tight text-inverse-surface mb-xl">Summary</h3>
          <div className="space-y-md mb-xl">
            <div className="flex justify-between">
              <span>Order Type</span>
              <span className="font-label-bold capitalize">{orderType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-label-bold">₪{deliveryFee.toFixed(2)}</span>
            </div>
            {pointsToUse > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Points Discount ({pointsToUse} pts)</span>
                <span className="font-label-bold">−₪{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-md">
              <span className="font-h3">Total</span>
              <span className="font-h3 text-primary">₪{finalTotal.toFixed(2)}</span>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-md py-sm text-body-sm mb-md">
              {error}
            </div>
          )}
          <button
            onClick={handlePlaceOrder}
            disabled={submitting}
            className="w-full py-md bg-primary-container text-on-primary font-h3 rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-60"
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
