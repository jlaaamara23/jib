import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { resendVerificationEmail } from '../api/api'
import './Auth.css'

export default function Register() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const [success, setSuccess] = useState(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(null)
    setLoading(true)
    try {
      const data = await register(email, password, 'CUSTOMER', phone)
      if (data.token) {
        navigate('/')
      } else {
        setSuccess(data.email || email)
      }
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!success) return
    setResendError('')
    setResendMessage('')
    setResendLoading(true)
    try {
      await resendVerificationEmail(success)
      setResendMessage(t('auth.resendSent'))
    } catch (err) {
      setResendError(err.message || t('auth.resendWait'))
    } finally {
      setResendLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <h1>{t('auth.register')}</h1>
        <div className="auth-success-box">
          <p>{t('auth.checkYourEmail')}</p>
          <p className="auth-email-sent">{t('auth.emailSentTo')} <strong>{success}</strong></p>
          {resendMessage && <p className="auth-success-msg">{resendMessage}</p>}
          {resendError && <p className="auth-error">{resendError}</p>}
          <p className="auth-resend-row">
            {t('auth.didntGetEmail')}{' '}
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleResend} disabled={resendLoading}>
              {resendLoading ? '…' : t('auth.resendVerification')}
            </button>
          </p>
          <Link to="/login" className="btn btn-primary">{t('auth.login')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <h1>{t('auth.register')}</h1>
      <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <label>
          {t('auth.email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
        </label>
        <label>
          {t('auth.phone')}
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" placeholder="050-1234567" />
        </label>
        <label>
          {t('auth.password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={4} />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? t('auth.registering') : t('auth.register')}
        </button>
      </form>
      <p className="auth-footer">
        {t('auth.haveAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  )
}
