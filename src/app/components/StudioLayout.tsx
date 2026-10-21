import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router"
import { StudioBackground } from "./StudioBackground"
import { StudioIcon, type StudioIconName } from "./StudioIcon"

const navigation: { to: string label: string icon: StudioIconName }[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/create-packaging", label: "Create Packaging", icon: "plus" },
  { to: "/workspace", label: "3D Workspace", icon: "cube" },
  { to: "/optimize", label: "Optimize & Compare", icon: "compare" },
  { to: "/green-impact", label: "Green Impact", icon: "leaf" },
  { to: "/export", label: "Export & Reports", icon: "export" },
]

export function StudioLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(
    () => localStorage.getItem("morphopack-theme") === "dark",
  )
  const location = useLocation()

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light"
    localStorage.setItem("morphopack-theme", dark ? "dark" : "light")
  }, [dark])

  useEffect(() => setMenuOpen(false), [location.pathname])

  return (
    <div className="studio-shell">
      <StudioBackground />
      <aside
        className={
          menuOpen ? "studio-sidebar studio-sidebar-open" : "studio-sidebar"
        }
      >
        <Link className="studio-logo" to="/">
          <span>
            <StudioIcon name="box" size={17} />
          </span>
          <div>
            <strong>MorphoPack</strong>
            <small>PACKAGING INTELLIGENCE</small>
          </div>
        </Link>
        <p className="studio-nav-label">WORKSPACE</p>
        <nav className="studio-nav" aria-label="Product studio">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <StudioIcon name={item.icon} size={17} />
              <span>{item.label}</span>
              <StudioIcon name="chevron" size={13} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-impact">
          <StudioIcon name="leaf" size={19} />
          <strong>Less material. More possibility.</strong>
          <p>Intelligent structures for a lighter footprint.</p>
          <Link to="/green-impact">
            Explore material guide <StudioIcon name="arrow" size={13} />
          </Link>
        </div>
        <div className="sidebar-user">
          <span>AL</span>
          <div>
            <strong>Alex Linden</strong>
            <small>SAMPLE WORKSPACE</small>
          </div>
        </div>
      </aside>

      <div className="studio-main">
        <header className="studio-topbar">
          <div className="studio-breadcrumb">
            <button
              className="studio-mobile-menu"
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <StudioIcon name={menuOpen ? "x" : "menu"} />
            </button>
            <Link to="/">MorphoPack</Link>
            <span>/</span>
            <strong>
              {navigation.find((item) => item.to === location.pathname)
                ?.label ?? "Studio"}
            </strong>
          </div>
          <div className="studio-top-actions">
            <span className="sample-pill">SAMPLE WORKSPACE</span>
            <button
              className="studio-theme-toggle"
              type="button"
              onClick={() => setDark(!dark)}
            >
              <StudioIcon name={dark ? "sun" : "moon"} size={16} />
              <span>{dark ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>
        <main className="studio-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
