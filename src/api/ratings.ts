import api from './axios'

export const submitRating = (driverId: number, customerId: number, rating: number, comment?: string) =>
  api.post('/ratings', { driver_id: driverId, customer_id: customerId, rating, comment })

export const checkRating = (driverId: number, customerId: number) =>
  api.get(`/ratings/check/${driverId}/${customerId}`)

export const getDriverRatings = (driverId: number) =>
  api.get(`/ratings/driver/${driverId}`)
