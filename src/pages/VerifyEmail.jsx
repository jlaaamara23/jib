import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail, resendVerificationEmail } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './Auth.css'

export default function VerifyEmail() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [resendErr, setResendErr] = useState('')

  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus('error')
      setMessage(t('auth.verifyInvalid'))
      return
    }
    verifyEmail(token)
      .then((data) => {
        setStatus('success')
        setMessage(data.message || t('auth.verifySuccess'))
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || t('auth.verifyFailed'))
      })
  }, [token, t])

  return (
    <div className="auth-page">
      <h1>{t('auth.verifyEmail')}</h1>
      {status === 'loading' && <p className="auth-subtitle">{t('auth.verifying')}</p>}
      {status === 'success' && (
        <div className="auth-success-box">
          <p>{message}</p>
          <Link to="/login" className="btn btn-primary">{t('auth.login')}</Link>
        </div>
      )}
      {status === 'error' && (
        <div className="auth-error-box">
          <p>{message}</p>
          <div className="auth-resend-block">
            <p className="auth-resend-label">{t('auth.resendVerification')}</p>
            <input
              type="email"
              className="auth-input"
              placeholder={t('auth.email')}
              value={resendEmail}
              onChange={(e) => { setResendEmail(e.target.value); setResendErr(''); setResendMsg(''); }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                if (!resendEmail.trim()) return
                setResendErr(''); setResendMsg('')
                setResendLoading(true)
                try {
                  await resendVerificationEmail(resendEmail)
                  setResendMsg(t('auth.resendSent'))
                } catch (err) {
                  setResendErr(err.message || t('auth.resendWait'))
                } finally {
                  setResendLoading(false)
                }
              }}
              disabled={resendLoading || !resendEmail.trim()}
            >
              {resendLoading ? '…' : t('auth.resendVerification')}
            </button>
            {resendMsg && <p className="auth-success-msg">{resendMsg}</p>}
            {resendErr && <p className="auth-error">{resendErr}</p>}
          </div>
          <Link to="/login" className="btn btn-primary">{t('auth.login')}</Link>
          <Link to="/register" className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>{t('auth.register')}</Link>
        </div>
      )}
    </div>
  )
}
