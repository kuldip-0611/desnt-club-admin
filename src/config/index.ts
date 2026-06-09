import { ENVIRONMENT } from './environment'

const baseUrls = {
  [ENVIRONMENT.DEV]: 'https://dev.api.mid-termstays.com/',
  [ENVIRONMENT.LIVE]: 'https://api.mid-termstays.com/',
  [ENVIRONMENT.LOCAL]: 'http://localhost:3001/',
}

export const currentEnvironment = ENVIRONMENT.LOCAL

if (!(currentEnvironment in baseUrls)) {
  throw new Error(`Invalid ENVIRONMENT: ${currentEnvironment}`)
}

const baseUrl = baseUrls[currentEnvironment]

export default baseUrl
export { baseUrl }
