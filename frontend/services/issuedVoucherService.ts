import { api } from "./api"

type ApiData<T> = { data: { data: T } }

export interface IssuedVoucherResult {
  issued_voucher: {
    id: string
    voucher_code: string
    qr_code_payload: string
    status: string
    expired_date: string
    voucher_products?: { name?: string; thumbnail_url?: string }
  }
  redeemable: boolean
  reason: string | null
  eligible_branch_ids: string[]
}

function data<T>(response: ApiData<T>) {
  return response.data.data
}

export const issuedVoucherService = {
  async validate(code: string) {
    let payload: { voucher_code?: string; qr_code_payload?: string } = { voucher_code: code }
    try {
      const url = new URL(code)
      const voucherCode = url.searchParams.get("code")
      payload = voucherCode ? { voucher_code: voucherCode } : { qr_code_payload: code }
    } catch {
      // Manual input is a voucher code.
    }
    const response = await api.post("/issued-vouchers/validate", payload)
    return data<IssuedVoucherResult>(response)
  },

  async redeem(id: string, branchId: string) {
    const response = await api.post(`/issued-vouchers/${id}/redeem`, { branch_id: branchId })
    return data(response)
  },
}
