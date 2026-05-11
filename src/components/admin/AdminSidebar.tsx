import { Link, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/orders', label: 'Orders', icon: 'receipt_long' },
  { path: '/admin/drivers', label: 'Drivers', icon: 'local_shipping' },
  { path: '/admin/customers', label: 'Customers', icon: 'people' },
  { path: '/admin/payments', label: 'Payments', icon: 'payments' },
  { path: '/admin/support', label: 'Support', icon: 'support_agent' },
  { path: '/admin/restaurants', label: 'Restaurants', icon: 'storefront' },
]

export default function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const active = (path: string) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path)

  function handleLogout() {
    localStorage.removeItem('adminLoggedIn')
    navigate('/admin/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-surface dark:bg-inverse-surface shadow-sm flex flex-col py-xl border-r border-outline-variant/30 z-50">
      <div className="mb-4 px-4 py-1 flex justify-center">
        <Link to="/admin">
          <img src="/logo.png" alt="ElyasX" className="w-36 h-auto object-contain" />
        </Link>
      </div>
      <nav className="flex-1 flex flex-col">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`font-label-bold border-l-4 pl-4 py-3 flex items-center gap-3 transition-colors ${
              active(item.path)
                ? 'text-primary dark:text-primary-fixed border-primary dark:border-primary-fixed bg-surface-container-low dark:bg-surface-variant/10'
                : 'text-on-surface-variant dark:text-secondary-fixed-dim border-transparent hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-outline-variant/30 pt-md">
        <button
          onClick={handleLogout}
          className="text-on-surface-variant dark:text-secondary-fixed-dim font-label-bold border-l-4 border-transparent pl-4 py-3 flex items-center gap-3 hover:text-error transition-colors w-full cursor-pointer"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
