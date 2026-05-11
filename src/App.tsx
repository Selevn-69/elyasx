import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'
import DriverLayout from './layouts/DriverLayout'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/customer/DashboardPage'
import NewOrderStep1Page from './pages/customer/NewOrderStep1Page'
import NewOrderStep2Page from './pages/customer/NewOrderStep2Page'
import NewOrderStep3Page from './pages/customer/NewOrderStep3Page'
import OrdersPage from './pages/customer/OrdersPage'
import OrderDetailPage from './pages/customer/OrderDetailPage'
import AddressesPage from './pages/customer/AddressesPage'
import NotificationsPage from './pages/customer/NotificationsPage'
import SupportPage from './pages/customer/SupportPage'
import ProfilePage from './pages/customer/ProfilePage'
import DriverLoginPage from './pages/driver/DriverLoginPage'
import DriverDashboardPage from './pages/driver/DriverDashboardPage'
import DriverActiveDeliveryPage from './pages/driver/DriverActiveDeliveryPage'
import DriverDeliveriesPage from './pages/driver/DriverDeliveriesPage'
import DriverProfilePage from './pages/driver/DriverProfilePage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminDriversPage from './pages/admin/AdminDriversPage'
import AdminCustomersPage from './pages/admin/AdminCustomersPage'
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage'
import AdminSupportPage from './pages/admin/AdminSupportPage'
import AdminRestaurantsPage from './pages/admin/AdminRestaurantsPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />
}

function DriverProtectedRoute({ children }: { children: ReactNode }) {
  const isLoggedIn = localStorage.getItem('driverLoggedIn') === 'true'
  return isLoggedIn ? <>{children}</> : <Navigate to="/driver/login" replace />
}

function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true'
  return isLoggedIn ? <>{children}</> : <Navigate to="/admin/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/new-order" element={<NewOrderStep1Page />} />
          <Route path="/new-order-details" element={<NewOrderStep2Page />} />
          <Route path="/payment" element={<NewOrderStep3Page />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/addresses" element={<AddressesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Driver portal */}
        <Route
          path="/driver/login"
          element={
            <AuthLayout>
              <DriverLoginPage />
            </AuthLayout>
          }
        />
        <Route
          element={
            <DriverProtectedRoute>
              <DriverLayout />
            </DriverProtectedRoute>
          }
        >
          <Route path="/driver" element={<DriverDashboardPage />} />
          <Route path="/driver/active" element={<DriverActiveDeliveryPage />} />
          <Route path="/driver/deliveries" element={<DriverDeliveriesPage />} />
          <Route path="/driver/profile" element={<DriverProfilePage />} />
        </Route>

        {/* Admin portal */}
        <Route
          path="/admin/login"
          element={
            <AuthLayout>
              <AdminLoginPage />
            </AuthLayout>
          }
        />
        <Route
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/drivers" element={<AdminDriversPage />} />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/support" element={<AdminSupportPage />} />
          <Route path="/admin/restaurants" element={<AdminRestaurantsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
