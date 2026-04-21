import { useApp } from '../../lib/context'

export default function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div className="toast-container">
      <div className={`toast ${toast.type}`}>{toast.message}</div>
    </div>
  )
}
