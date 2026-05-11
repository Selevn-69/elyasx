import api from './axios'

export const adminLogin = (email: string, password: string) =>
  api.post('/admin/login', { email, password })

export const getAdminStats = () =>
  api.get('/admin/stats')

export const getAllOrders = () =>
  api.get('/orders')

export const getAllPayments = () =>
  api.get('/payments')

export const getAllTickets = () =>
  api.get('/support')

export const getAllDrivers = () =>
  api.get('/drivers')

export const getAllCustomers = () =>
  api.get('/customers')

export const getCustomerById = (id: number) =>
  api.get(`/customers/${id}`)

export const addCustomerPoints = (id: number, points: number) =>
  api.patch(`/customers/${id}/points`, { points })

export const addDriverPoints = (id: number, points: number) =>
  api.patch(`/drivers/${id}/points`, { points })

export const assignDriver = (orderId: number, driverId: number) =>
  api.put(`/orders/${orderId}/assign-driver`, { driver_id: driverId })

export const updateTicketStatus = (ticketId: number, status: string) =>
  api.put(`/support/${ticketId}/status`, { status })

export const getDriverPendingPayments = (driverId: number) =>
  api.get(`/drivers/${driverId}/pending-payments`)

export const settleDriverPayments = (driverId: number, action: 'completed' | 'failed') =>
  api.post(`/drivers/${driverId}/settle-payments`, { action })

export const getAllRestaurants = () =>
  api.get('/restaurants')

export const createRestaurant = (data: { name: string; address: string; phone: string; cuisine_type?: string; delivery_fee?: number }) =>
  api.post('/restaurants/', data)

export const updateRestaurant = (id: number, data: { name?: string; address?: string; phone?: string; cuisine_type?: string; delivery_fee?: number }) =>
  api.put(`/restaurants/${id}`, data)

export const deleteRestaurant = (id: number) =>
  api.delete(`/restaurants/${id}`)
