import { useState, useContext } from 'react'
import { toast } from 'react-toastify'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import { AuthContext } from '../context/AuthContext'
import AppLogo from '../components/AppLogo'
import { showAuthSuccessToast } from '../components/AuthToast'

// Truncate password to 72 bytes (bcrypt limit)
const truncatePassword = (password) => {
  const encoded = new TextEncoder().encode(password)
  if (encoded.length <= 72) return password
  return new TextDecoder().decode(encoded.slice(0, 72))
}

/* â”€â”€ Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Icon = {
  Email: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  EyeOff: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Spinner: () => (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  Arrow: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Zap: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Chart: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  DB: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  Error: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
}

const features = [
  { icon: <Icon.Zap />,   label: 'AI query generation',  desc: 'Natural language to SQL instantly' },
  { icon: <Icon.Chart />, label: 'Smart optimization',   desc: 'Auto-improve query performance'    },
  { icon: <Icon.DB />,    label: 'Live DB execution',    desc: 'Connect any database directly'     },
]

function Login() {
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await authAPI.login({
        email,
        password: truncatePassword(password),
      })
      login(response.data.access_token)
      showAuthSuccessToast({
        title: 'Welcome back!',
        message: 'You are signed in and ready to continue.',
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Figtree:wght@400;500;600;700&display=swap');
        html, body, #root { height: 100%; overflow: hidden; }
        *, *::before, *::after { font-family: 'Figtree', sans-serif; box-sizing: border-box; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) forwards; }
        .left-panel::-webkit-scrollbar { width: 0px; }
        .left-panel { scrollbar-width: none; }
        input:-webkit-autofill,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #111827 inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
          caret-color: #f1f5f9;
        }
      `}</style>

      <div className="h-screen w-screen overflow-hidden bg-[#080d18] flex">

        {/* â”€â”€ Left branding panel â€” scrolls internally if screen is short â”€â”€ */}
        <div
          className="left-panel hidden lg:flex flex-col w-[420px] flex-shrink-0 overflow-y-auto overflow-x-hidden relative"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 40%, #7c3aed 100%)' }}
        >
          {/* Dot-grid texture pinned behind everything */}
          <div
            className="sticky top-0 left-0 w-full h-0 pointer-events-none"
            style={{ zIndex: 0 }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)',
              backgroundSize: '28px 28px',
              zIndex: 0,
            }}
          />
          {/* Glow blob */}
          <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)', zIndex: 0 }} />

          {/* Scrollable content */}
          <div className="relative z-10 flex flex-col justify-between min-h-full p-10">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-white/12 border border-white/20 rounded-xl flex items-center justify-center p-1">
                <AppLogo size={30} alt="SQL Query Agent" />
              </div>
              <span className="text-white font-semibold text-sm tracking-tight">SQL Query Agent</span>
            </div>

            {/* Headline + features */}
            <div className="my-auto py-12">
              <h1 className="text-[2rem] font-bold text-white leading-tight tracking-tight mb-3">
                Build smarter<br />SQL workflows
              </h1>
              <p className="text-blue-100/65 text-sm leading-relaxed mb-9">
                Generate, optimize and execute SQL with AI precision â€” in seconds.
              </p>
              <div className="space-y-4">
                {features.map(({ icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3.5">
                    <div className="w-9 h-9 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center flex-shrink-0 text-white">
                      {icon}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold leading-none mb-1">{label}</p>
                      <p className="text-blue-100/55 text-xs leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

        {/* Footer */}
            <footer className="border-t border-white/10 bg-white/5 backdrop-blur-sm -mx-10 -mb-10 px-10 py-4 rounded-b-none">
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <p>Â© {new Date().getFullYear()} SQL Query Agent. All rights reserved.</p>
                <div className="flex items-center gap-4">
                  <a href="#" className="hover:text-white/90 transition-colors">Privacy</a>
                  <a href="#" className="hover:text-white/90 transition-colors">Terms</a>
                  <a href="#" className="hover:text-white/90 transition-colors">Contact</a>
                </div>
              </div>
            </footer>
 
          </div>
        </div>

        {/* â”€â”€ Right form panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-1 flex items-center justify-center px-4 bg-[#080d18] relative overflow-hidden">

          {/* Subtle top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[180px] bg-blue-700/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-sm fade-up">

            {/* Card */}
            <div className="bg-[#0e1624] border-2 border-slate-700 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">

              {/* Top accent bar */}
              <div className="h-[3px] w-full bg-gradient-to-r from-blue-600 via-blue-400 to-violet-600" />

              <div className="px-7 py-7">

                {/* Mobile logo + heading */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-4 lg:hidden">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-slate-700 flex items-center justify-center p-1">
                      <AppLogo size={28} alt="SQL Query Agent" />
                    </div>
                    <span className="text-white font-semibold text-sm">SQL Query Agent</span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Welcome back</h2>
                  <p className="text-slate-400 text-xs mt-1 font-medium">Sign in to your account to continue</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 rounded-lg px-3 py-2.5 mb-4">
                    <span className="flex-shrink-0"><Icon.Error /></span>
                    <span className="text-red-400 text-xs font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300 pl-0.5">
                      Email Address
                    </label>
                    <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 border-2 transition-all duration-150 ${
                      focusedField === 'email'
                        ? 'border-blue-500 bg-[#111c2e] shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
                        : 'border-slate-600 bg-[#111827] hover:border-slate-500'
                    }`}>
                      <span className={`flex-shrink-0 transition-colors ${focusedField === 'email' ? 'text-blue-400' : 'text-slate-400'}`}>
                        <Icon.Email />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between pl-0.5 pr-0.5">
                      <label className="block text-xs font-semibold text-slate-300">Password</label>
                      <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors font-medium">
                        Forgot password?
                      </span>
                    </div>
                    <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 border-2 transition-all duration-150 ${
                      focusedField === 'password'
                        ? 'border-blue-500 bg-[#111c2e] shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
                        : 'border-slate-600 bg-[#111827] hover:border-slate-500'
                    }`}>
                      <span className={`flex-shrink-0 transition-colors ${focusedField === 'password' ? 'text-blue-400' : 'text-slate-400'}`}>
                        <Icon.Lock />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors relative z-10 right-5"
                        tabIndex={-1}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <Icon.EyeOff /> : <Icon.Eye />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-900/30 tracking-wide"
                  >
                    {loading ? (
                      <><Icon.Spinner /> Signing in...</>
                    ) : (
                      <>Sign in <Icon.Arrow /></>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-700" />
                  <span className="text-slate-500 text-xs font-medium">Don't have an account?</span>
                  <div className="flex-1 h-px bg-slate-700" />
                </div>

                {/* Register link */}
                <Link
                  to="/register"
                  className="flex items-center justify-center w-full py-2.5 px-4 border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-800/40 rounded-lg text-slate-300 hover:text-white text-sm font-semibold transition-all"
                >
                  Register
                </Link>

              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-600 mt-3 font-medium">
              Protected by industry-standard encryption
            </p>

          </div>
        </div>
      </div>
    </>
  )
}

export default Login

