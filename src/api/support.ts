import api from './axios'

export const getTickets = (customerId: number) =>
  api.get(`/support/customer/${customerId}`)

export const createTicket = (data: object) =>
  api.post('/support', data)
