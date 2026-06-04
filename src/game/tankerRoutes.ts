import type { TankerRouteId } from './types'

export const ROUTE_STYLE: Record<
  TankerRouteId,
  { stripe: string; accent: string; label: string }
> = {
  china: { stripe: '#dc2626', accent: '#fbbf24', label: 'CN ROUTE' },
  russia: { stripe: '#2563eb', accent: '#f8fafc', label: 'RU ROUTE' },
  pacific: { stripe: '#0d9488', accent: '#f0fdfa', label: 'PACIFIC' },
  eastern: { stripe: '#ea580c', accent: '#1c1917', label: 'EASTERN' },
  arctic: { stripe: '#1e3a5f', accent: '#e2e8f0', label: 'ARCTIC' },
}
