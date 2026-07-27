// Placeholder service — thay phần body bằng axios call thật khi có backend
// import axios from "axios"
import { API } from "@/api/endpoints"
import type { Voucher } from "@/types"
import { VOUCHERS } from "@/data/mock"

export const voucherService = {
  // GET /vouchers
  async getAll(params?: { category?: string; search?: string; sort?: string }): Promise<Voucher[]> {
    // TODO: return (await axios.get(API.VOUCHERS, { params })).data
    void API.VOUCHERS
    let result = [...VOUCHERS]
    if (params?.category && params.category !== "all")
      result = result.filter((v) => v.category === params.category)
    if (params?.search)
      result = result.filter((v) =>
        v.title.toLowerCase().includes(params.search!.toLowerCase()) ||
        v.partnerName.toLowerCase().includes(params.search!.toLowerCase())
      )
    return result
  },

  // GET /vouchers/:id
  async getById(id: string): Promise<Voucher | undefined> {
    // TODO: return (await axios.get(API.VOUCHER(id))).data
    void API.VOUCHER(id)
    return VOUCHERS.find((v) => v.id === id)
  },

  // POST /vouchers/verify
  async verifyCode(code: string) {
    // TODO: return (await axios.post(API.VOUCHER_VERIFY, { code })).data
    void API.VOUCHER_VERIFY
    return { code, valid: true }
  },
}
