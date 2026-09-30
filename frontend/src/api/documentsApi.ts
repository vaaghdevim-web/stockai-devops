import { apiClient } from './client'

// Matches StoredDocumentResponse in the existing backend DocumentController contract.
export interface StoredDocument {
  documentId: string
  fileName: string
  contentType: string
  sizeBytes: number | null
  category: string | null
  storageLocation: string | null
  plantId: number | null
  uploadedBy: string | null
  uploadedAt: string | null
}
export async function listDocuments(): Promise<StoredDocument[]> {
  const { data } = await apiClient.get<StoredDocument[]>('/api/v1/documents')
  if (!Array.isArray(data)) throw new Error('Invalid document list response')
  return data
}
export async function downloadDocument(documentId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/api/v1/documents/${encodeURIComponent(documentId)}/download`, { responseType: 'blob' })
  return data
}
