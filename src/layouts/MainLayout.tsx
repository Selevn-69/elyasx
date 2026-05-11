import { Outlet, useLocation } from 'react-router-dom'
import SideNavBar from '../components/SideNavBar'
import TopHeader from '../components/TopHeader'

function getTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/': 'Dashboard',
    '/new-order': 'New Order',
    '/new-order-details': 'Order Details',
    '/payment': 'Payment',
    '/orders': 'My Orders',
    '/addresses': 'Addresses',
    '/notifications': 'Notifications',
    '/support': 'Support Center',
    '/profile': 'My Profile',
  }
  if (/^\/orders\/.+/.test(pathname)) return 'Order Details'
  return map[pathname] ?? 'ElyasX'
}

export default function MainLayout() {
  const location = useLocation()
  return (
    <div className="min-h-screen">
      <SideNavBar />
      <TopHeader title={getTitle(location.pathname)} />
      <main className="ml-[240px] pt-20 min-h-screen px-gutter pb-xxl max-w-max_width mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
