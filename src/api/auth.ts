import api from './axios'

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const register = (name: string, phone: string, email: string, password: string) =>
  api.post('/auth/register', { name, phone, email, password })

export const driverLogin = (phone: string, password: string) =>
  api.post('/auth/driver/login', { phone, password })

export const adminLogin = (email: string, password: string) =>
  api.post('/auth/admin/login', { email, password })
