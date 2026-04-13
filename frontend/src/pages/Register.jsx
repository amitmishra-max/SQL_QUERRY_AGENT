import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'

function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authAPI.register({ email, password, full_name: fullName })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    {
      key: 'fullName',
      type: 'text',
      placeholder: 'Full Name',
      value: fullName,
      onChange: (e) => setFullName(e.target.value),
      label: 'Full Name',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      key: 'email',
      type: 'email',
      placeholder: 'Email address',
      value: email,
      onChange: (e) => setEmail(e.target.value),
      label: 'Email Address',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
    {
      key: 'password',
      type: showPassword ? 'text' : 'password',
      placeholder: 'Password',
      value: password,
      onChange: (e) => setPassword(e.target.value),
      label: 'Password',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
      suffix: (
        <button
          type="button"
          onClick={() => setShowPassword(p => !p)}
          className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
          tabIndex={-1}
          aria-label="Toggle password visibility"
        >
          {showPassword ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      ),
    },
  ]

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
        .fade-up { animation: fadeUp 0.35s cubic-bezier(.22,1,.36,1) forwards; }
        input:-webkit-autofill,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #111827 inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
          caret-color: #f1f5f9;
        }
      `}</style>

      {/* Full viewport, no overflow */}
      <div className="h-screen w-screen overflow-hidden bg-[#080d18] flex items-center justify-center pt-5 px-4">

        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[220px] bg-blue-700/10 rounded-full blur-3xl" />
        </div>

        {/* Card â€” compact, no overflow */}
        <div className="relative w-full max-w-sm fade-up">
          <div className="bg-[#0e1624] border-2 border-slate-700 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">

            {/* Top accent bar */}
            <div className="h-[5px] w-full bg-gradient-to-r from-blue-600 via-blue-400 to-violet-600" />

            <div className="px-7 py-6">

              {/* Logo + Heading */}
              <div className="flex flex-col items-center mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-900/40">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">Create account</h1>
                <p className="text-slate-400 text-xs mt-1 font-medium">Join SQL Query Agent today</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">

                {/* Error banner */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 rounded-lg px-3 py-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <span className="text-red-400 text-xs font-medium">{error}</span>
                  </div>
                )}

                {/* Fields */}
                {fields.map(({ key, type, placeholder, value, onChange, label, icon, suffix }) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300 pl-0.5">
                      {label}
                    </label>
                    <div
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 border-2 transition-all duration-150 ${
                        focusedField === key
                          ? 'border-blue-500 bg-[#111c2e] shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
                          : 'border-slate-600 bg-[#111827] hover:border-slate-500'
                      }`}
                    >
                      <span className={`flex-shrink-0 transition-colors ${focusedField === key ? 'text-blue-400' : 'text-slate-400'}`}>
                        {icon}
                      </span>
                      <input
                        type={type}
                        required
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                        onFocus={() => setFocusedField(key)}
                        onBlur={() => setFocusedField(null)}
                        className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none font-medium"
                      />
                      {suffix}
                    </div>
                  </div>
                ))}

                {/* Password hint â€” takes no extra space unless needed */}
                <div className="h-4 flex items-center">
                  {password.length > 0 && password.length < 8 && (
                    <div className="flex items-center gap-1.5 pl-0.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span className="text-amber-400 text-xs font-medium">Use at least 8 characters</span>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-900/30 tracking-wide"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    <>
                      Sign up
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-xs font-medium">Already have an account?</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              {/* Sign in */}
              <Link
                to="/login"
                className="flex items-center justify-center w-full py-2.5 px-4 border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-800/40 rounded-lg text-slate-300 hover:text-white text-sm font-semibold transition-all"
              >
                Sign in
              </Link>

            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-600 mt-1 font-medium">
            By signing up you agree to our{' '}
            <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors">Terms of Service</span>
          </p>
        </div>
      </div>
    </>
  )
}

export default Register

