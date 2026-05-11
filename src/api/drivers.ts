import api from './axios'

export const getDriver = (driverId: number) =>
  api.get(`/drivers/${driverId}`)

export const getDriverDeliveries = (driverId: number) =>
  api.get(`/deliveries/driver/${driverId}`)

export const updateDeliveryStatus = (id: number, status: string) =>
  api.put(`/deliveries/${id}/status`, { status })

export const updateDriverStatus = (id: number, status: string) =>
  api.put(`/drivers/${id}/status`, { status })

export const acceptDelivery = (id: number) =>
  api.post(`/deliveries/${id}/accept`)

export const declineDelivery = (id: number) =>
  api.post(`/deliveries/${id}/decline`)
