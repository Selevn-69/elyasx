import { Outlet, useLocation } from 'react-router-dom'
import DriverSidebar from '../components/driver/DriverSidebar'
import DriverHeader from '../components/driver/DriverHeader'

interface PageInfo {
  title: string
  subtitle?: string
}

function getPageInfo(pathname: string, driverName: string): PageInfo {
  if (pathname === '/driver') return { title: 'Driver Dashboard', subtitle: `Welcome back, ${driverName}` }
  if (pathname.startsWith('/driver/active')) return { title: 'Order Tracking', subtitle: 'In Progress #EX-49201' }
  if (pathname.startsWith('/driver/deliveries')) return { title: 'My Deliveries' }
  if (pathname.startsWith('/driver/profile')) return { title: 'Profile' }
  return { title: 'Driver Portal' }
}

export default function DriverLayout() {
  const location = useLocation()
  const driverName = localStorage.getItem('driverName') || 'Driver'
  const pageInfo = getPageInfo(location.pathname, driverName)

  return (
    <div className="min-h-screen">
      <DriverSidebar />
      <DriverHeader title={pageInfo.title} subtitle={pageInfo.subtitle} />
      <main className="ml-[240px] pt-20 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
