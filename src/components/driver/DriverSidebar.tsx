import { Link, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/driver', label: 'Dashboard', icon: 'dashboard' },
  { path: '/driver/deliveries', label: 'My Deliveries', icon: 'package_2' },
  { path: '/driver/active', label: 'Active Tracking', icon: 'local_shipping' },
  { path: '/driver/profile', label: 'Profile', icon: 'person' },
]

export default function DriverSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const active = (path: string) =>
    path === '/driver'
      ? location.pathname === '/driver'
      : location.pathname.startsWith(path)

  function handleLogout() {
    localStorage.removeItem('driverLoggedIn')
    navigate('/driver/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-surface dark:bg-inverse-surface shadow-sm flex flex-col py-xl border-r border-outline-variant/30 z-50">
      <div className="mb-4 px-4 py-1 flex justify-center">
        <Link to="/driver">
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
