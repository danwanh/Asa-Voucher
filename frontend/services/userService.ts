import { api } from "./api"
import type {UserQuery, CreateUserData, UpdateUserData} from "@/types"

export async function getUsers(params?: UserQuery) {
  const response = await api.get("/users", { params })
  return response.data
}

export async function getUser(id: string) {
  const response = await api.get(`/users/${id}`)
  return response.data
}

export async function createUser(data: CreateUserData) {
  const response = await api.post("/users", data)
  return response.data
}

export async function updateUser(id: string, data: UpdateUserData) {
  const response = await api.patch(`/users/${id}`, data)
  return response.data
}