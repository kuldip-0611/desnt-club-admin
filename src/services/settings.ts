import api from './api'
import type { BasicSettings } from '../types/settings'

export const getBasicSettings = async (): Promise<BasicSettings> => {
  const { data } = await api.get<BasicSettings>('/settings/basic')
  return data
}
