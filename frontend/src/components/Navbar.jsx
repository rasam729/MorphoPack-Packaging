import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Package, BarChart3, History, User, LogOut, Menu, X } from 'lucide-react'

export default function Navbar({ user, onLogout }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const isActive = (path) => location.pathname === path
  const isStudio = ['/dashboard', '/analytics', '/history', '/login'].includes(location.pathname)
  const isLanding = location.pathname === '/' && !user

  return (
    <nav className={isStudio ? 'studio-nav' : ''} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: isStudio
        ? 'rgba(255,255,255,0.95)'
        : scrolled ? 'rgba(10,14,26,0.95)' : 'rgba(10,14,26,0.7)',
      backdropFilter: 'blur(20px)',
      borderBottom: isStudio
        ? '1px solid #E1E7DF'
        : scrolled ? '1px solid #1F2937' : '1px solid transparent',
      transition: 'all 0.3s ease',
      height: '64px',
    }}>
      <div className={isLanding ? 'marketing-nav-inner' : undefined} style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Logo */}
        <Link to="/" className="brand-logo-link" aria-label="MorphoPack home">
          <img className="brand-logo-image" src="/morphopack-icon.png" alt=""/>
          <span className="brand-logo-wordmark">Morpho<span>Pack</span></span>
        </Link>

        {isLanding && (
          <div className="marketing-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#sustainability">Sustainability</a>
            <a href="#pipeline">Pipeline</a>
          </div>
        )}

        {/* Nav links — desktop */}
        {user && !isStudio && (
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { to: '/dashboard', icon: <Package size={15}/>, label: 'Workspace' },
              { to: '/analytics', icon: <BarChart3 size={15}/>, label: 'Analytics' },
              { to: '/history', icon: <History size={15}/>, label: 'History' },
            ].map(({ to, icon, label }) => (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                borderRadius: 9, textDecoration: 'none', fontSize: 14, fontWeight: 500,
                color: isActive(to) ? '#F9FAFB' : '#9CA3AF',
                background: isActive(to) ? 'rgba(255,255,255,0.07)' : 'transparent',
                transition: 'all 0.2s',
              }}>
                {icon}{label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <Link to="/profile" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                border: `1px solid ${isStudio ? '#DCE5DC' : '#1F2937'}`,
                background: isActive('/profile') ? 'rgba(255,255,255,0.07)' : 'transparent',
                transition: 'all 0.2s',
              }}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" style={{ width: 26, height: 26, borderRadius: '50%' }} />
                ) : (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#22C55E,#10B981)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#000',
                  }}>
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span style={{                 fontSize: 14, fontWeight: 500, color: isStudio ? '#33483A' : '#F9FAFB' }}>
                  {user.name || user.email?.split('@')[0]}
                </span>
              </Link>
              <button onClick={onLogout} className="btn-ghost" style={{ padding: '7px 10px' }}
                title="Sign out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary" style={{ padding: '7px 18px' }}>Sign In</Link>
              <Link to="/login?mode=register" className="btn-primary" style={{ padding: '7px 18px' }}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
