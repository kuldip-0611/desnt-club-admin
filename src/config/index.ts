import { ENVIRONMENT } from './environment'

const baseUrls: Record<ENVIRONMENT, string> = {
  [ENVIRONMENT.DEV]: 'https://dev-api.disentclub.com/',
  [ENVIRONMENT.LIVE]: 'https://api.disentclub.com/',
  [ENVIRONMENT.LOCAL]: 'http://localhost:3001/',
}

const siteUrls: Record<ENVIRONMENT, string> = {
  [ENVIRONMENT.DEV]: 'https://dev.disentclub.com',
  [ENVIRONMENT.LIVE]: 'https://disentclub.com',
  [ENVIRONMENT.LOCAL]: 'http://localhost:3000',
}

const normalizeBaseUrl = (url: string): string => {
  const trimmed = url.trim()
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

const trimTrailingSlash = (url: string): string => url.trim().replace(/\/+$/, '')

const parseAppEnv = (): ENVIRONMENT => {
  const raw = import.meta.env.VITE_APP_ENV
  if (raw === 'dev' || raw === '1') return ENVIRONMENT.DEV
  if (raw === 'live' || raw === 'production' || raw === '2') return ENVIRONMENT.LIVE
  return ENVIRONMENT.LOCAL
}

const resolveBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return normalizeBaseUrl(fromEnv)
  }
  return baseUrls[parseAppEnv()]
}

const resolveSiteUrl = (): string => {
  const fromEnv = import.meta.env.VITE_SITE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return trimTrailingSlash(fromEnv)
  }
  return siteUrls[parseAppEnv()]
}

export const currentEnvironment = parseAppEnv()
const baseUrl = resolveBaseUrl()
export const siteUrl = resolveSiteUrl()

export default baseUrl
export { baseUrl }
