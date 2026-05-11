import { Link, useLocation, useNavigate } from 'react-router-dom'

interface NavItemProps {
  to: string
  icon: string
  label: string
  isActive: boolean
}

function NavItem({ to, icon, label, isActive }: NavItemProps) {
  return (
    <Link
      to={to}
      className={`font-label-bold border-l-4 pl-4 py-3 flex items-center gap-3 transition-colors ${
        isActive
          ? 'text-primary dark:text-primary-fixed border-primary dark:border-primary-fixed bg-surface-container-low dark:bg-surface-variant/10'
          : 'text-on-surface-variant dark:text-secondary-fixed-dim border-transparent hover:bg-surface-container-low'
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

export default function SideNavBar() {
  const location = useLocation()
  const navigate = useNavigate()

  const active = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path)

  function handleLogout() {
    localStorage.removeItem('isLoggedIn')
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-surface dark:bg-inverse-surface shadow-sm flex flex-col py-xl z-50">
      <div className="mb-4 px-4 py-1 flex justify-center">
        <Link to="/">
          <img src="/logo.png" alt="ElyasX" className="w-36 h-auto object-contain" />
        </Link>
      </div>
      <nav className="flex-1 flex flex-col">
        <NavItem to="/" icon="home" label="Home" isActive={active('/')} />
        <NavItem to="/new-order" icon="add_shopping_cart" label="New Order" isActive={active('/new-order')} />
        <NavItem to="/orders" icon="package_2" label="My Orders" isActive={active('/orders')} />
        <NavItem to="/addresses" icon="location_on" label="Addresses" isActive={active('/addresses')} />
        <NavItem to="/notifications" icon="notifications" label="Notifications" isActive={active('/notifications')} />
        <NavItem to="/support" icon="support_agent" label="Support" isActive={active('/support')} />
        <NavItem to="/profile" icon="person" label="Profile" isActive={active('/profile')} />
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
