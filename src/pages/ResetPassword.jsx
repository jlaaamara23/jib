import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './Auth.css'

export default function ResetPassword() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError(t('auth.passwordTooShort'))
    if (password !== confirm) return setError(t('auth.passwordsDontMatch'))
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message || t('auth.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>{t('auth.resetTitle')}</h1>
      {done ? (
        <div className="auth-success-box">
          <p>{t('auth.resetDone')}</p>
          <Link to="/login" className="btn btn-primary">{t('auth.login')}</Link>
        </div>
      ) : !token ? (
        <div className="auth-error-box">
          <p>{t('auth.resetInvalid')}</p>
          <Link to="/forgot-password" className="btn btn-primary">{t('auth.forgotTitle')}</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <label>
            {t('auth.newPassword')}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            {t('auth.confirmPassword')}
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.saving') : t('auth.savePassword')}
          </button>
        </form>
      )}
    </div>
  )
}
