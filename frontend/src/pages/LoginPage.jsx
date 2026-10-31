import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Box, Eye, EyeOff, Globe, Leaf, Lock, Mail, User } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import api from '../utils/api.js'
import './LoginPage.css'

export default function LoginPage({ onLogin }) {
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleButtonKey, setGoogleButtonKey] = useState(0)
  const navigate = useNavigate()
  const googleConfigured = Boolean(
    import.meta.env.VITE_GOOGLE_CLIENT_ID
    && import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your-google-oauth-client-id-here',
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      let user
      if (mode === 'register') {
        user = await api.register({ name: form.name, email: form.email, password: form.password })
      } else {
        user = await api.login({ email: form.email, password: form.password })
      }
      onLogin(user, rememberMe)
      navigate('/dashboard')
    } catch (e) {
      setError(e.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credentialResponse) => {
    setError(''); setLoading(true)
    try {
      const token = credentialResponse.credential
      if (!token) throw new Error('Google did not return a sign-in credential. Please try again.')
      const tokenPart = token.split('.')[1]
      if (!tokenPart) throw new Error('Google returned an invalid sign-in credential. Please try again.')
      const payload = JSON.parse(atob(tokenPart.replace(/-/g, '+').replace(/_/g, '/')))
      if (!payload.sub || !payload.email) {
        throw new Error('Google did not return the required account details. Please try again.')
      }
      const user = await api.googleAuth({
        google_id: payload.sub,
        email: payload.email,
        name: payload.name,
        avatar_url: payload.picture,
      })
      onLogin(user, rememberMe)
      navigate('/dashboard')
    } catch (e) {
      setError(e.message || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase" aria-label="Sustainable packaging design">
        <Link to="/" className="login-brand">
          <img src="/morphopack-icon.png" alt=""/>
          <span className="login-brand-wordmark">Morpho<span>Pack</span></span>
        </Link>
        <div className="login-showcase-copy">
          <span>THE FUTURE TAKES A PAPER SHAPE.</span>
          <h1>Made to fit your<br/>product.<br/><span>Designed to respect<br/>the planet.</span></h1>
          <p>AI-powered geometry. Thoughtful materials. A smarter path from product to packaging.</p>
          <div className="login-showcase-values">
            <span><Leaf size={18}/> Sustainable<br/>by Design</span>
            <span><Box size={19}/> Intelligent<br/>Precision</span>
            <span><Globe size={19}/> A Greener<br/>Tomorrow</span>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="login-eyebrow">{mode === 'register' ? 'YOUR NEXT IDEA STARTS HERE' : 'WELCOME BACK TO YOUR STUDIO'}</span>
            <h2>{mode === 'register' ? 'Create your account.' : 'Welcome to your studio.'}</h2>
            <p>{mode === 'register'
              ? 'Create an account to shape packaging that fits your product and your values.'
              : 'Sign in to shape your next idea, refine a fit, and pick up where you left off.'}</p>
          </div>

          <div className="login-google">
            {googleConfigured ? (
              <>
                <GoogleLogin
                  key={googleButtonKey}
                  onSuccess={handleGoogle}
                  onError={() => setError('Google sign-in was cancelled or failed. Choose an account and try again.')}
                  auto_select={false}
                  prompt="select_account"
                  theme="outline"
                  shape="rectangular"
                  text={mode === 'register' ? 'signup_with' : 'signin_with'}
                  size="large"
                  width="400"
                />
                <button
                  type="button"
                  className="login-google-other"
                  onClick={() => {
                    setError('')
                    setGoogleButtonKey((current) => current + 1)
                  }}
                >
                  Use another Google account
                </button>
              </>
            ) : (
              <p className="login-google-unavailable" role="status">
                Google sign-in is not configured for this deployment. Use email sign-in or set a valid Google OAuth client ID.
              </p>
            )}
          </div>
          <div className="login-divider"><span>or continue with email</span></div>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="login-field">
                <span>Full name</span>
                <div><User size={16}/><input id="name-input" type="text" placeholder="Jane Smith"
                  value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required/></div>
              </label>
            )}
            <label className="login-field">
              <span>Email address</span>
              <div><Mail size={16}/><input id="email-input" type="email" placeholder="you@company.com"
                value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required/></div>
            </label>
            <label className="login-field">
              <span>Password</span>
              <div>
                <Lock size={16}/>
                <input id="password-input" type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                  value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  required minLength={6}/>
                <button className="login-password-toggle" type="button" onClick={() => setShowPw((visible) => !visible)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </label>

            {mode === 'login' && (
              <div className="login-form-options">
                <label><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)}/> Remember me</label>
                <span>Secure sign-in</span>
              </div>
            )}

            {error && <div className="login-error" role="alert"><AlertCircle size={15}/>{error}</div>}

            <button id="auth-submit-btn" className="login-submit" type="submit" disabled={loading}>
              {loading ? <span className="login-spinner"/> : mode === 'register' ? 'Create your account' : '→  Sign in to MorphoPack'}
            </button>
          </form>

          <div className="login-mode-toggle">
            {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}
            <button type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError('') }}>
              {mode === 'register' ? 'Sign in' : 'Create an account'}
            </button>
          </div>
          <p className="login-terms">By continuing, you agree to MorphoPack&apos;s Terms of Service and Privacy Policy.</p>
        </div>
      </section>
    </main>
  )
}
