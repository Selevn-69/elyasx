import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminHeader from '../components/admin/AdminHeader'

interface PageInfo {
  title: string
  subtitle?: string
}

function getPageInfo(pathname: string): PageInfo {
  if (pathname === '/admin') return { title: 'Admin Dashboard', subtitle: 'Welcome back, Admin' }
  if (pathname.startsWith('/admin/orders')) return { title: 'Orders Management' }
  if (pathname.startsWith('/admin/drivers')) return { title: 'Drivers Management' }
  if (pathname.startsWith('/admin/customers')) return { title: 'Customers Management' }
  if (pathname.startsWith('/admin/payments')) return { title: 'Payments & Transactions' }
  if (pathname.startsWith('/admin/support')) return { title: 'Support Tickets' }
  return { title: 'Admin Panel' }
}

export default function AdminLayout() {
  const location = useLocation()
  const pageInfo = getPageInfo(location.pathname)

  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <AdminHeader title={pageInfo.title} subtitle={pageInfo.subtitle} />
      <main className="ml-[240px] pt-20 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
