import api from './axios'

export const getAddresses = (customerId: number) =>
  api.get(`/addresses/customer/${customerId}`)

export const addAddress = (data: object) =>
  api.post('/addresses', data)

export const deleteAddress = (id: number) =>
  api.delete(`/addresses/${id}`)
