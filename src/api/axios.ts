import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

api.interceptors.request.use((config) => {
  const customerId = localStorage.getItem('customer_id')
  if (customerId) {
    config.headers['customer_id'] = customerId
  }
  return config
})

export default api
