import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './Auth.css'

export default function ForgotPassword() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || t('auth.forgotFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>{t('auth.forgotTitle')}</h1>
      {sent ? (
        <div className="auth-success-box">
          <p>{t('auth.forgotSent')}</p>
          <Link to="/login" className="btn btn-primary">{t('auth.login')}</Link>
        </div>
      ) : (
        <>
          <p className="auth-subtitle">{t('auth.forgotSubtitle')}</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}
            <label>
              {t('auth.email')}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? t('auth.sending') : t('auth.sendResetLink')}
            </button>
          </form>
          <p className="auth-footer"><Link to="/login">{t('auth.backToLogin')}</Link></p>
        </>
      )}
    </div>
  )
}
