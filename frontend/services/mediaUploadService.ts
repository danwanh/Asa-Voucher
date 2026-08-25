import axios from "axios"
import { api } from "./api"

type Envelope<T> = { data: T; message?: string }

type UploadSignature = {
  cloud_name: string
  api_key: string
  timestamp: number
  folder: string
  signature: string
}

async function uploadWithSignature(file: File, signature: UploadSignature) {
  const body = new FormData()
  body.append("file", file)
  body.append("api_key", signature.api_key)
  body.append("timestamp", String(signature.timestamp))
  body.append("folder", signature.folder)
  body.append("signature", signature.signature)

  const response = await axios.post<{ secure_url: string }>(
    `https://api.cloudinary.com/v1_1/${signature.cloud_name}/image/upload`,
    body
  )
  return response.data.secure_url
}

function unwrap<T>(response: { data: Envelope<T> }) {
  return response.data.data
}

export const mediaUploadService = {
  async uploadImages(files: File[]) {
    if (files.length === 0) return []
    const signature = unwrap(await api.post<Envelope<UploadSignature>>("/reviews/media/signature"))
    return Promise.all(files.map((file) => uploadWithSignature(file, signature)))
  },

  async uploadImage(file: File) {
    const [url] = await this.uploadImages([file])
    return url
  },

  async uploadAvatar(file: File) {
    const signature = unwrap(await api.post<Envelope<UploadSignature>>("/users/avatar/signature"))
    return uploadWithSignature(file, signature)
  },
}
