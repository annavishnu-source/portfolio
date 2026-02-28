import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-circle login-bg-circle-1" />
        <div className="login-bg-circle login-bg-circle-2" />
      </div>

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <img src="/logo.svg" alt="AnnaVault" className="login-logo-img" />
          <div className="login-logo-text">
            <span className="login-logo-name">AnnaVault</span>
            <span className="login-logo-tagline">Where Wealth Takes Root</span>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Welcome back</h1>
            <p className="login-sub">Sign in to access your private vault</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label className="login-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="login-error">
                <span className="login-error-icon">!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-btn-loading">
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="login-footer">
          Private & Secure · AnnaVault © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
