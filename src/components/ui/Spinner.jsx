export default function Spinner({ dark = false }) {
  return <span className={`spinner${dark ? ' spinner-dark' : ''}`} />
}
