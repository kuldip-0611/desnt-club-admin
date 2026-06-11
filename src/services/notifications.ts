import api from './api'

export const sendBroadcast = async (payload: { title: string; body: string; type: string }): Promise<{ sent: number }> => {
  const { data } = await api.post('/admin/notifications/broadcast', payload)
  return data
}
