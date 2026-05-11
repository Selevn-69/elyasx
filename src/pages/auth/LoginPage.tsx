import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { login, register } from '../../api/auth'

// Shared input + wrapper styles
const inputCls =
  'w-full pl-12 pr-md py-md bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 font-body-md transition-all duration-150'
const inputWrap = 'relative transition-transform duration-150 focus-within:scale-[1.01]'

// Per-field stagger helper
function s(i: number): CSSProperties {
  return { animation: 'slideUp 0.35s ease-out both', animationDelay: `${i * 60}ms` }
}

// Social sign-in section — receives the stagger start index
function SocialButtons({ from }: { from: number }) {
  const btnCls =
    'flex items-center justify-center bg-white border border-[#E5E5E5] py-sm px-md rounded-lg font-label-bold text-on-surface hover:brightness-95 active:scale-[0.98] transition-all duration-150'
  return (
    <>
      <div style={s(from)} className="w-full relative mt-xxl">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#E5E5E5]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-md bg-surface-container-lowest font-label-bold text-label-bold text-on-surface-variant uppercase tracking-widest">
            Or continue with
          </span>
        </div>
      </div>
      <div style={s(from + 1)} className="grid grid-cols-2 gap-md w-full mt-xl">
        <button className={btnCls}>Google</button>
        <button className={btnCls}>Apple</button>
      </div>
    </>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [activeForm, setActiveForm] = useState<'login' | 'register'>('login')
  const [visible, setVisible] = useState(true)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register form state
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  function switchTab(tab: 'login' | 'register') {
    if (tab === activeForm) return
    setVisible(false)
    setLoginError('')
    setRegError('')
    setTimeout(() => {
      setActiveForm(tab)
      setVisible(true)
    }, 150)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await login(loginEmail, loginPassword)
      const customer = res.data.customer
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userName', customer.name)
      localStorage.setItem('customer_id', String(customer.customer_id))
      localStorage.setItem('userEmail', customer.email ?? '')
      localStorage.setItem('userPhone', customer.phone ?? '')
      navigate('/')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setLoginError(error.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError('')
    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match.')
      return
    }
    setRegLoading(true)
    try {
      const res = await register(regName, regPhone, regEmail, regPassword)
      const customer = res.data.customer
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userName', customer.name)
      localStorage.setItem('customer_id', String(customer.customer_id))
      localStorage.setItem('userEmail', customer.email ?? '')
      localStorage.setItem('userPhone', customer.phone ?? '')
      navigate('/')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setRegError(error.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setRegLoading(false)
    }
  }

  const activeTab =
    'flex-1 py-sm px-md rounded-lg font-label-bold text-label-bold relative z-10 transition-colors duration-200 text-on-primary'
  const inactiveTab =
    'flex-1 py-sm px-md rounded-lg font-label-bold text-label-bold relative z-10 transition-colors duration-200 text-secondary'

  return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-gutter">
      <main className="w-full max-w-[480px]">
        <div
          className="rounded-xl soft-shadow p-xxl flex flex-col items-center bg-surface-container-lowest"
          style={{ animation: 'cardEntrance 0.4s ease-out both', willChange: 'transform, opacity' }}
        >
          {/* Logo block */}
          <div className="mb-xxl text-center" style={s(0)}>
            <img src="/logo.png" alt="ElyasX" className="w-36 h-auto object-contain mx-auto mb-md" />
            <p className="font-body-sm text-on-surface-variant">
              Your reliable multi-service delivery partner
            </p>
          </div>

          {/* Sliding tab switcher */}
          <div className="w-full flex mb-xl bg-surface-container rounded-lg p-xs relative" style={s(1)}>
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-primary-container pointer-events-none transition-transform duration-200 ease-in-out"
              style={{
                width: 'calc(50% - 6px)',
                left: '4px',
                transform:
                  activeForm === 'register' ? 'translateX(calc(100% + 4px))' : 'translateX(0)',
              }}
            />
            <button className={activeForm === 'login' ? activeTab : inactiveTab} onClick={() => switchTab('login')}>
              Login
            </button>
            <button className={activeForm === 'register' ? activeTab : inactiveTab} onClick={() => switchTab('register')}>
              Register
            </button>
          </div>

          <div className={`w-full transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {/* ── LOGIN FORM ── */}
            {activeForm === 'login' && (
              <form className="w-full space-y-lg" onSubmit={handleLogin}>
                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-md py-sm text-body-sm">
                    {loginError}
                  </div>
                )}

                <div style={s(0)} className="space-y-xs">
                  <label className="font-label-bold text-label-bold text-on-surface-variant ml-1">
                    Email Address
                  </label>
                  <div className={inputWrap}>
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      mail
                    </span>
                    <input
                      className={inputCls}
                      placeholder="name@example.com"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={s(1)} className="space-y-xs">
                  <div className="flex justify-between items-center ml-1">
                    <label className="font-label-bold text-label-bold text-on-surface-variant">
                      Password
                    </label>
                    <a className="font-label-bold text-label-bold text-primary-container hover:underline" href="#">
                      Forgot Password?
                    </a>
                  </div>
                  <div className={inputWrap}>
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      lock
                    </span>
                    <input
                      className={inputCls}
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  style={s(2)}
                  className="w-full bg-primary-container text-on-primary font-label-bold text-h3 py-md rounded-lg hover:brightness-105 active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
                  type="submit"
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>

                <SocialButtons from={3} />
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {activeForm === 'register' && (
              <form className="w-full space-y-lg" onSubmit={handleRegister}>
                {regError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-md py-sm text-body-sm">
                    {regError}
                  </div>
                )}

                <div style={s(0)} className="space-y-xs">
                  <label className="font-label-bold text-label-bold text-on-surface-variant ml-1">
                    Full Name
                  </label>
                  <div className={inputWrap}>
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      person
                    </span>
                    <input
                      className={inputCls}
                      placeholder="Alex Rivera"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={s(1)} className="space-y-xs">
                  <label className="font-label-bold text-label-bold text-on-surface-variant ml-1">
                    Phone Number
                  </label>
                  <div className={inputWrap}>
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      phone
                    </span>
                    <input
                      className={inputCls}
                      placeholder="+1 555-0123"
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={s(2)} className="space-y-xs">
                  <label className="font-label-bold text-label-bold text-on-surface-variant ml-1">
                    Email Address
                  </label>
                  <div className={inputWrap}>
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      mail
                    </span>
                    <input
                      className={inputCls}
                      placeholder="name@example.com"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={s(3)} className="space-y-xs">
                  <label className="font-label-bold text-label-bold text-on-surface-variant ml-1">
                    Password
                  </label>
                  <div className={inputWrap}>
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      lock
                    </span>
                    <input
                      className={inputCls}
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={s(4)} className="space-y-xs">
                  <label className="font-label-bold text-label-bold text-on-surface-variant ml-1">
                    Confirm Password
                  </label>
                  <div className={inputWrap}>
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      lock
                    </span>
                    <input
                      className={inputCls}
                      type="password"
                      placeholder="••••••••"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  style={s(5)}
                  className="w-full bg-primary-container text-on-primary font-label-bold text-h3 py-md rounded-lg hover:brightness-105 active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
                  type="submit"
                  disabled={regLoading}
                >
                  {regLoading ? 'Creating Account...' : 'Create Account'}
                </button>

                <SocialButtons from={6} />
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
