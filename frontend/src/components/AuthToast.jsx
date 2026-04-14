import { toast } from 'react-toastify'

const ToastCheckIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

function AuthToast({ eyebrow = 'Authentication', title, message }) {
  return (
    <div className="auth-toast-card">
      <div className="auth-toast-icon">
        <ToastCheckIcon />
      </div>
      <div className="auth-toast-copy">
        <p className="auth-toast-title">{title}</p>
      </div>
    </div>
  )
}

export const showAuthSuccessToast = ({ eyebrow, title, message, options } = {}) =>
  toast.success(
    <AuthToast
      eyebrow={eyebrow}
      title={title}
      message={message}
    />,
    {
      className: 'auth-toast-shell',
      bodyClassName: 'auth-toast-body',
      progressClassName: 'auth-toast-progress',
      icon: false,
      closeButton: false,
      ...options,
    },
  )

export default AuthToast
