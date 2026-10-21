import type { ReactNode } from "react"
import { StudioIcon, type StudioIconName } from "./StudioIcon"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function StudioButton({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "quiet"
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
}) {
  return (
    <button
      className={`studio-button studio-button-${variant}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  trend,
}: {
  label: string
  value: string
  detail: string
  icon: StudioIconName
  trend?: string
}) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span>{label}</span>
        <StudioIcon name={icon} size={16} />
      </div>
      <strong>{value}</strong>
      <div className="metric-card-detail">
        {trend && <span>{trend}</span>}
        <small>{detail}</small>
      </div>
    </article>
  )
}

export function StatusPill({
  children,
  tone = "success",
}: {
  children: ReactNode
  tone?: "success" | "warning" | "neutral"
}) {
  return <span className={`status-pill status-pill-${tone}`}>{children}</span>
}
