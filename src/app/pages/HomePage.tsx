import { useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark"
type IconName = "arrow" | "box" | "check" | "cube" | "download" | "leaf" | "menu" | "moon" | "play" | "spark" | "sun" | "upload" | "x"

const features = [
  {
    id: "create",
    number: "01",
    label: "Create",
    title: "Start with the product, not the box.",
    copy: "Upload a 3D mesh or multi-view image, choose from lower-impact materials, and let MorphoPack create a precise first fit.",
    image: "/morphopack/create.png",
    meta: ["GLB + imagery", "Material library", "Fit clearance"],
  },
  {
    id: "workspace",
    number: "02",
    label: "Shape",
    title: "Refine every fold in a live 3D workspace.",
    copy: "Tune dimensions, tolerances, wall thickness, and dielines while feasibility checks keep the design production-ready.",
    image: "/morphopack/workspace.png",
    meta: ["3D preview", "2D dieline", "Live validation"],
  },
  {
    id: "optimize",
    number: "03",
    label: "Optimize",
    title: "Compare structures, not assumptions.",
    copy: "Score variants against protection, manufacturability, cost, volume, and waste—then inspect intelligent sheet nesting.",
    image: "/morphopack/optimize.png",
    meta: ["Variant matrix", "Trade-offs", "Sheet nesting"],
  },
  {
    id: "impact",
    number: "04",
    label: "Measure",
    title: "Make the footprint visible.",
    copy: "Turn material savings, package mass, production waste, and compute into a clear impact story your whole team can use.",
    image: "/morphopack/impact.png",
    meta: ["Carbon model", "Material saved", "Impact report"],
  },
  {
    id: "export",
    number: "05",
    label: "Export",
    title: "From approved geometry to the factory floor.",
    copy: "Export clean SVG dielines, dimension-rich GLB files, and polished PDF impact reports with assumptions attached.",
    image: "/morphopack/export.png",
    meta: ["SVG", "GLB", "PDF"],
  },
  {
    id: "dashboard",
    number: "06",
    label: "Track",
    title: "One studio for every packaging decision.",
    copy: "Keep active designs, material savings, package weight, jobs, and recent work visible in a calm shared dashboard.",
    image: "/morphopack/dashboard.png",
    meta: ["Project history", "Team metrics", "Recent designs"],
  },
  {
    id: "account",
    number: "07",
    label: "Govern",
    title: "Built for accountable team workflows.",
    copy: "Manage studio preferences, generated assets, design history, and production-ready exports from one secure account.",
    image: "/morphopack/account.png",
    meta: ["Design history", "Preferences", "Asset control"],
  },
]

const steps = [
  {
    number: "01",
    eyebrow: "INPUT",
    title: "Bring your product",
    copy: "Upload a 3D model or a set of product views. Enter dimensions only when you need to override the source geometry.",
    image: "/morphopack/create.png",
    note: "Mesh recognized",
    icon: "upload" as IconName,
  },
  {
    number: "02",
    eyebrow: "GENERATE",
    title: "Shape the intelligent fit",
    copy: "Select a material and generate form-fitting structures. Refine tolerances while automatic checks guard feasibility.",
    image: "/morphopack/workspace.png",
    note: "Geometry ready",
    icon: "cube" as IconName,
  },
  {
    number: "03",
    eyebrow: "DECIDE",
    title: "Compare, prove, export",
    copy: "Choose the best balance of protection and impact, then hand off fabrication files and a transparent footprint report.",
    image: "/morphopack/optimize.png",
    note: "6.8% less offcut",
    icon: "check" as IconName,
  },
]

function Icon({ name, size = 18 }: { name: IconName size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v9" />
      </>
    ),
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    cube: (
      <>
        <path d="m12 2 8.5 5v10L12 22l-8.5-5V7L12 2Z" />
        <path d="m3.8 7.2 8.2 4.9 8.2-4.9M12 12v9.4" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M5 20h14" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4C10 4 5 9 5 16c4 1 9-1 11-5" />
        <path d="M4 20c2-5 6-8 12-9" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.7a8.5 8.5 0 1 0 12 11.8Z" />,
    play: <path d="m9 7 8 5-8 5V7Z" />,
    spark: (
      <>
        <path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9L12 3Z" />
        <path d="m18.5 15 .6 2.1 1.9.9-1.9.9-.6 2.1-.6-2.1L16 18l1.9-.9.6-2.1Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L8 8m4-4 4 4" />
        <path d="M4 15v5h16v-5" />
      </>
    ),
    x: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
  }

  return <svg {...common}>{paths[name]}</svg>
}

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="MorphoPack home">
      <span className="logo-mark">
        <Icon name="box" size={17} />
      </span>
      <span>MorphoPack</span>
    </a>
  )
}

function Button({
  children,
  href,
  variant = "primary",
  onClick,
  className = "",
}: {
  children: ReactNode
  href?: string
  variant?: "primary" | "secondary" | "ghost"
  onClick?: () => void
  className?: string
}) {
  const classes = `button button-${variant} ${className}`
  return href ? (
    <a className={classes} href={href}>
      {children}
    </a>
  ) : (
    <button className={classes} onClick={onClick} type="button">
      {children}
    </button>
  )
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "left",
}: {
  eyebrow: string
  title: ReactNode
  copy?: string
  align?: "left" | "center"
}) {
  return (
    <div className={`section-heading section-heading-${align}`}>
      <span className="eyebrow">
        <span />
        {eyebrow}
      </span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  )
}

function BlueprintBackground() {
  return (
    <div className="blueprint" aria-hidden="true">
      <svg
        className="blueprint-lines blueprint-lines-one"
        viewBox="0 0 700 400"
      >
        <path d="M-20 210C110 40 210 390 360 210S590 30 740 170" />
        <path d="M-20 225C110 55 210 405 360 225S590 45 740 185" />
        <path d="M-20 240C110 70 210 420 360 240S590 60 740 200" />
        <path d="M-20 255C110 85 210 435 360 255S590 75 740 215" />
        <path d="M-20 270C110 100 210 450 360 270S590 90 740 230" />
      </svg>
      <svg
        className="blueprint-dieline blueprint-dieline-one"
        viewBox="0 0 220 170"
      >
        <path d="M65 20h55v28h38v74h-38v28H65v-28H27V48h38V20Z" />
        <path d="M65 48v74m55-74v74M27 85h131" strokeDasharray="5 5" />
      </svg>
      <svg
        className="blueprint-dieline blueprint-dieline-two"
        viewBox="0 0 220 170"
      >
        <path d="M65 20h55v28h38v74h-38v28H65v-28H27V48h38V20Z" />
        <path d="M65 48v74m55-74v74M27 85h131" strokeDasharray="5 5" />
      </svg>
      <div className="poly poly-one" />
      <div className="poly poly-two" />
      <div className="dot-grid" />
    </div>
  )
}

function BrowserFrame({
  src,
  alt,
  className = "",
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <figure className={`browser-frame ${className}`}>
      <div className="browser-bar">
        <span />
        <span />
        <span />
        <div className="browser-address">studio.morphopack.design</div>
      </div>
      <img src={src} alt={alt} />
    </figure>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("morphopack-theme") as Theme | null
    return (
      saved ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    )
  })
  const [activeFeature, setActiveFeature] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("morphopack-theme", theme)
  }, [theme])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible")
        })
      },
      { threshold: 0.12 },
    )
    document
      .querySelectorAll(".reveal")
      .forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const currentFeature = features[activeFeature]

  return (
    <div className="site-shell" id="top">
      <header className="site-header">
        <div className="nav-shell">
          <Logo />
          <nav
            className={menuOpen ? "nav-links nav-links-open" : "nav-links"}
            aria-label="Main navigation"
          >
            <a href="#product" onClick={() => setMenuOpen(false)}>
              Platform
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#impact" onClick={() => setMenuOpen(false)}>
              Sustainability
            </a>
            <a href="#studio" onClick={() => setMenuOpen(false)}>
              Studio
            </a>
          </nav>
          <div className="nav-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={`Switch to ${
                theme === "light" ? "dark" : "light"
              } mode`}
            >
              <span
                className={
                  theme === "light" ? "toggle-icon active" : "toggle-icon"
                }
              >
                <Icon name="sun" size={15} />
              </span>
              <span
                className={
                  theme === "dark" ? "toggle-icon active" : "toggle-icon"
                }
              >
                <Icon name="moon" size={14} />
              </span>
            </button>
            <Button href="/dashboard" variant="ghost" className="signin-button">
              Open studio
            </Button>
            <Button href="/dashboard">
              Launch app <Icon name="arrow" size={16} />
            </Button>
            <button
              type="button"
              className="menu-button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? "x" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <BlueprintBackground />
          <div className="hero-inner">
            <div className="hero-copy reveal is-visible">
              <span className="eyebrow hero-eyebrow">
                <span />
                AI-ENGINEERED SUSTAINABLE PACKAGING
              </span>
              <h1>
                Every shape. <em>Zero waste.</em>
                <br />
                Fit to the millimetre.
              </h1>
              <p>
                Upload any 3D product. MorphoPack generates tight-fitting,
                manufacturable packaging—cutting void fill, material, and carbon
                before production begins.
              </p>
              <div className="hero-actions">
                <Button href="#product">
                  <Icon name="spark" size={17} /> Explore the platform
                </Button>
                <Button href="#how-it-works" variant="secondary">
                  <Icon name="play" size={16} /> See how it works
                </Button>
              </div>
              <div className="hero-proof">
                <div className="proof-avatars" aria-hidden="true">
                  <span>AL</span>
                  <span>MK</span>
                  <span>SR</span>
                </div>
                <p>
                  <strong>31% less material</strong>
                  <br />
                  across sample packaging studies
                </p>
              </div>
            </div>

            <div className="hero-visual reveal is-visible">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <BrowserFrame
                src="/morphopack/dashboard.png"
                alt="MorphoPack studio dashboard"
              />
              <div className="floating-card floating-impact">
                <span className="floating-icon">
                  <Icon name="leaf" size={16} />
                </span>
                <span>
                  <small>Material saved</small>
                  <strong>31%</strong>
                </span>
              </div>
              <div className="floating-card floating-ready">
                <span className="status-dot" />
                <span>
                  <small>Sensor module</small>
                  <strong>Geometry ready</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="hero-index">
            <span>01</span>
            <div />
            <span>07</span>
          </div>
        </section>

        <section className="metric-strip" aria-label="Platform outcomes">
          <div className="metric-track">
            <span>
              31% <small>LESS MATERIAL</small>
            </span>
            <i />
            <span>
              6.4% <small>PRODUCTION WASTE</small>
            </span>
            <i />
            <span>
              4.2s <small>GENERATION TIME</small>
            </span>
            <i />
            <span>
              3 <small>PRODUCTION-READY EXPORTS</small>
            </span>
            <i />
            <span>
              31% <small>LESS MATERIAL</small>
            </span>
          </div>
        </section>

        <section className="section product-section" id="product">
          <div className="container">
            <SectionHeading
              eyebrow="ONE CONNECTED WORKFLOW"
              title={
                <>
                  From product to possibility,
                  <br /> without the packaging guesswork.
                </>
              }
              copy="Every decision lives in one place—from initial geometry to verified impact."
            />

            <div
              className="feature-tabs reveal"
              role="tablist"
              aria-label="MorphoPack capabilities"
            >
              {features.map((feature, index) => (
                <button
                  key={feature.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFeature === index}
                  className={
                    activeFeature === index
                      ? "feature-tab active"
                      : "feature-tab"
                  }
                  onClick={() => setActiveFeature(index)}
                >
                  <span>{feature.number}</span>
                  {feature.label}
                </button>
              ))}
            </div>

            <div className="feature-stage reveal">
              <div className="feature-copy" key={`${currentFeature.id}-copy`}>
                <span className="feature-kicker">
                  <Icon
                    name={currentFeature.id === "impact" ? "leaf" : "spark"}
                    size={16}
                  />
                  {currentFeature.number} / {currentFeature.label}
                </span>
                <h3>{currentFeature.title}</h3>
                <p>{currentFeature.copy}</p>
                <ul>
                  {currentFeature.meta.map((item) => (
                    <li key={item}>
                      <Icon name="check" size={15} />
                      {item}
                    </li>
                  ))}
                </ul>
                <a className="text-link" href="#how-it-works">
                  See the workflow <Icon name="arrow" size={16} />
                </a>
              </div>
              <div className="feature-media" key={`${currentFeature.id}-image`}>
                <BrowserFrame
                  src={currentFeature.image}
                  alt={`${currentFeature.title} interface`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="section workflow-section" id="how-it-works">
          <BlueprintBackground />
          <div className="container">
            <SectionHeading
              eyebrow="HOW IT WORKS"
              title={
                <>
                  Three steps from object
                  <br />
                  to <em>optimized structure.</em>
                </>
              }
              copy="A guided visual workflow keeps engineering detail legible at every stage."
              align="center"
            />
            <div className="steps-grid">
              {steps.map((step) => (
                <article className="step-card reveal" key={step.number}>
                  <div className="step-topline">
                    <span className="step-number">{step.number}</span>
                    <span className="step-eyebrow">{step.eyebrow}</span>
                  </div>
                  <div className="step-image">
                    <img
                      src={step.image}
                      alt={`${step.title} in the MorphoPack interface`}
                    />
                    <span className="annotation-pin">
                      <Icon name={step.icon} size={14} />
                      {step.note}
                    </span>
                    <span className="annotation-line" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
            <div className="guide-note reveal">
              <div className="guide-note-icon">
                <Icon name="spark" />
              </div>
              <p>
                <strong>A better input, a better structure.</strong>
                Multi-view, mesh, and dimension data work together. Missing
                information is flagged before generation.
              </p>
              <a className="text-link" href="/create-packaging">
                Read the input guide <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
        </section>

        <section className="section impact-section" id="impact">
          <div className="container">
            <div className="impact-grid">
              <div className="impact-copy reveal">
                <SectionHeading
                  eyebrow="DESIGNED FOR CONSEQUENCE"
                  title={
                    <>
                      Less material.
                      <br />
                      <em>More possibility.</em>
                    </>
                  }
                  copy="MorphoPack treats sustainability as an engineering constraint—not a badge added at the end."
                />
                <blockquote>
                  “The most responsible package is the one whose excess was
                  designed out before it existed.”
                  <footer>MorphoPack design principle</footer>
                </blockquote>
              </div>
              <div className="impact-dashboard reveal">
                <div className="impact-card impact-card-main">
                  <div className="impact-label">
                    <Icon name="leaf" size={17} /> SMALLER BY NATURE
                  </div>
                  <strong>31%</strong>
                  <p>lower material footprint</p>
                  <div className="impact-bar">
                    <span />
                  </div>
                  <small>
                    Compared with a standard tuck carton for the same product.
                  </small>
                </div>
                <div className="sdg-card">
                  <span className="sdg-number">12</span>
                  <div>
                    <strong>Responsible consumption & production</strong>
                    <p>
                      Material-aware generation and nesting reduce virgin input
                      and offcut waste.
                    </p>
                  </div>
                </div>
                <div className="sdg-card">
                  <span className="sdg-number">13</span>
                  <div>
                    <strong>Climate action</strong>
                    <p>
                      Lower package mass and transparent estimates support
                      lower-carbon decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="impact-visual reveal">
              <BrowserFrame
                src="/morphopack/impact.png"
                alt="MorphoPack green impact report"
              />
              <div className="impact-quote">
                <span className="quote-mark">“</span>
                <p>
                  What gets modelled early can be improved before it becomes
                  waste.
                </p>
                <span>Design intelligence for SDG 12 & 13</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section studio-section" id="studio">
          <div className="container">
            <div className="studio-grid">
              <div className="studio-copy reveal">
                <SectionHeading
                  eyebrow="A STUDIO THAT REMEMBERS"
                  title={
                    <>
                      Your work, your standards,
                      <br />
                      your <em>shared intelligence.</em>
                    </>
                  }
                  copy="Move from secure access to a traceable packaging history without losing the intent behind each decision."
                />
                <div className="studio-points">
                  <div>
                    <span>01</span>
                    <p>
                      <strong>Secure by default</strong>Controlled access for
                      every studio and project.
                    </p>
                  </div>
                  <div>
                    <span>02</span>
                    <p>
                      <strong>Decisions preserved</strong>Materials, variants,
                      and exports stay connected.
                    </p>
                  </div>
                  <div>
                    <span>03</span>
                    <p>
                      <strong>Ready to hand off</strong>Production assets are
                      always one step away.
                    </p>
                  </div>
                </div>
              </div>
              <div className="studio-visual reveal">
                <img
                  className="studio-signin"
                  src="/morphopack/signin.png"
                  alt="MorphoPack secure studio sign in"
                />
                <img
                  className="studio-account"
                  src="/morphopack/account.png"
                  alt="MorphoPack account and design history"
                />
                <span className="studio-connector">
                  SECURE STUDIO / CONNECTED HISTORY
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="section launch-section" id="launch">
          <BlueprintBackground />
          <div className="launch-inner reveal">
            <span className="eyebrow">
              <span />
              YOUR NEXT PACKAGE STARTS HERE
            </span>
            <h2>
              Better packaging starts
              <br />
              with your <em>product.</em>
            </h2>
            <p>
              Bring the geometry. MorphoPack will help you remove the excess.
            </p>
            <div className="hero-actions">
              <Button href="/dashboard">
                Launch MorphoPack <Icon name="arrow" size={17} />
              </Button>
              <Button href="#product" variant="secondary">
                Explore capabilities
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div>
            <Logo />
            <p>
              AI-engineered packaging intelligence for a material-conscious
              world.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <strong>Platform</strong>
              <a href="#product">Create</a>
              <a href="#product">Optimize</a>
              <a href="#impact">Impact</a>
            </div>
            <div>
              <strong>Learn</strong>
              <a href="#how-it-works">How it works</a>
              <a href="#impact">Sustainability</a>
              <a href="#studio">Studio</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 MorphoPack</span>
          <span>Designed to respect the planet.</span>
          <div>
            <a href="#top">Privacy</a>
            <a href="#top">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
