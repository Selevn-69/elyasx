import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../../api/auth'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminLogin(email, password)
      const admin = res.data.admin
      localStorage.setItem('adminLoggedIn', 'true')
      localStorage.setItem('adminName', admin.name)
      localStorage.setItem('adminId', String(admin.admin_id))
      navigate('/admin')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-gutter bg-[#F8F8F8]">
      <main className="w-full max-w-[480px]">
        <div className="login-card bg-white rounded-xl p-xxl flex flex-col items-center">
          <div className="mb-xxl w-full flex justify-center">
            <img src="/logo.png" alt="ElyasX" className="w-36 h-auto object-contain" />
          </div>
          <div className="w-full mb-xl text-center">
            <h1 className="font-h2 text-h2 text-on-background mb-sm">Admin Portal</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Sign in to access the admin dashboard
            </p>
          </div>
          <form className="w-full space-y-lg" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-md py-sm text-body-sm">
                {error}
              </div>
            )}
            <div className="space-y-sm">
              <label className="font-label-bold text-label-bold text-on-surface-variant block" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">
                  email
                </span>
                <input
                  className="w-full pl-[44px] pr-md py-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface input-focus-ring transition-all placeholder:text-outline-variant"
                  id="email"
                  placeholder="admin@elyasx.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-sm">
              <div className="flex justify-between items-center">
                <label className="font-label-bold text-label-bold text-on-surface-variant block" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">
                  lock
                </span>
                <input
                  className="w-full pl-[44px] pr-[44px] py-md bg-white border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface input-focus-ring transition-all placeholder:text-outline-variant"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute right-md top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <button
              className="w-full py-md bg-primary-container text-white font-label-bold text-body-md rounded-lg shadow-[0_4px_12px_rgba(249,115,22,0.25)] hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Signing in...' : 'Login as Admin'}</span>
              {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
          </form>
        </div>
        <footer className="mt-xl text-center pb-8">
          <p className="font-body-sm text-body-sm text-outline">© 2024 ElyasX Logistics. All rights reserved.</p>
        </footer>
      </main>
    </div>
  )
}
