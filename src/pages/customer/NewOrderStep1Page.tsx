import { useNavigate } from 'react-router-dom'

const options = [
  {
    type: 'food',
    title: 'Food Delivery',
    icon: 'restaurant',
    desc: 'Order from your favorite restaurants and get hot meals delivered.',
  },
  {
    type: 'package',
    title: 'Package Shipping',
    icon: 'inventory_2',
    desc: 'Send documents or gifts across the city with real-time tracking.',
  },
  {
    type: 'online',
    title: 'Online Order',
    icon: 'shopping_basket',
    desc: 'Need someone to do groceries? We shop for you.',
  },
]

export default function NewOrderStep1Page() {
  const navigate = useNavigate()

  function handleSelect(type: string) {
    sessionStorage.setItem('newOrderType', type)
    sessionStorage.removeItem('newOrderDetails')
    navigate('/new-order-details')
  }

  return (
    <div className="max-w-max_width mx-auto py-xxl">
      {/* Step indicator */}
      <div className="flex justify-center mb-xxl">
        <div className="flex items-start">
          <div className="flex flex-col items-center gap-2 w-24">
            <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-label-bold shadow-lg">
              1
            </div>
            <span className="text-xs font-label-bold text-primary text-center">Select Type</span>
          </div>
          <div className="w-24 h-px bg-surface-container-high mt-4 shrink-0"></div>
          <div className="flex flex-col items-center gap-2 w-24">
            <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-bold">
              2
            </div>
            <span className="text-xs font-label-bold text-on-surface-variant text-center">Details</span>
          </div>
        </div>
      </div>

      <div className="text-center mb-xxl">
        <h2 className="font-h1 text-[42px] leading-tight text-inverse-surface mb-md">What are we delivering today?</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xxl">
        {options.map((opt) => (
          <button
            key={opt.type}
            onClick={() => handleSelect(opt.type)}
            className="relative flex flex-col items-center text-center p-xl rounded-[12px] shadow-sm transition-all group border-2 bg-[#F8F8F8] border-transparent hover:bg-surface-container-low hover:border-primary-container/40"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-lg transition-transform group-hover:scale-110 bg-on-surface-variant/5 text-on-surface-variant group-hover:bg-primary-container/10 group-hover:text-primary-container">
              <span className="material-symbols-outlined text-[48px]">{opt.icon}</span>
            </div>
            <h3 className="font-h3 text-[26px] leading-tight text-inverse-surface mb-sm">{opt.title}</h3>
            <p className="font-body-md text-on-surface-variant px-sm">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
