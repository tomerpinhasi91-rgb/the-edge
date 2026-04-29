import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1f2937', marginBottom: 6 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, maxWidth: 360, lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
