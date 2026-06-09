import api from './api'
import type {
  CreateMeasurementAttributePayload,
  CreateSizePayload,
  MeasurementAttribute,
  Size,
  UpdateMeasurementAttributePayload,
  UpdateSizePayload,
} from '../types/sizing'

export const listMeasurementAttributes = async (): Promise<MeasurementAttribute[]> => {
  const { data } = await api.get<MeasurementAttribute[]>('/admin/measurement-attributes')
  return data
}

export const getMeasurementAttribute = async (id: string): Promise<MeasurementAttribute> => {
  const { data } = await api.get<MeasurementAttribute>(`/admin/measurement-attributes/${id}`)
  return data
}

export const createMeasurementAttribute = async (
  payload: CreateMeasurementAttributePayload,
): Promise<MeasurementAttribute> => {
  const { data } = await api.post<MeasurementAttribute>('/admin/measurement-attributes', payload)
  return data
}

export const updateMeasurementAttribute = async (
  id: string,
  payload: UpdateMeasurementAttributePayload,
): Promise<MeasurementAttribute> => {
  const { data } = await api.patch<MeasurementAttribute>(
    `/admin/measurement-attributes/${id}`,
    payload,
  )
  return data
}

export const deleteMeasurementAttribute = async (id: string): Promise<void> => {
  await api.delete(`/admin/measurement-attributes/${id}`)
}

export const listSizes = async (): Promise<Size[]> => {
  const { data } = await api.get<Size[]>('/admin/sizes')
  return data
}

export const getSize = async (id: string): Promise<Size> => {
  const { data } = await api.get<Size>(`/admin/sizes/${id}`)
  return data
}

export const createSize = async (payload: CreateSizePayload): Promise<Size> => {
  const { data } = await api.post<Size>('/admin/sizes', payload)
  return data
}

export const updateSize = async (id: string, payload: UpdateSizePayload): Promise<Size> => {
  const { data } = await api.patch<Size>(`/admin/sizes/${id}`, payload)
  return data
}

export const deleteSize = async (id: string): Promise<void> => {
  await api.delete(`/admin/sizes/${id}`)
}
