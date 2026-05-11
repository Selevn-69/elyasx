import api from './axios'

export const getNotifications = (customerId: number) =>
  api.get(`/notifications/customer/${customerId}`)

export const markAsRead = (id: number) =>
  api.put(`/notifications/${id}/read`)
