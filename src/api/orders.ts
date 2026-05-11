import api from './axios'

export const getCustomerOrders = (customerId: number) =>
  api.get(`/orders/customer/${customerId}`)

export const getOrderById = (id: number) =>
  api.get(`/orders/${id}`)

export const createOrder = (data: object) =>
  api.post('/orders', data)
