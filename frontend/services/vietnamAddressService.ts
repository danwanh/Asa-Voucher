const BASE_URL = "https://provinces.open-api.vn/api/v1"

export type VietnamDistrict = {
  code: number
  name: string
}

export type VietnamProvince = {
  code: number
  name: string
  districts?: VietnamDistrict[]
}

let provincePromise: Promise<VietnamProvince[]> | null = null
const districtPromises = new Map<number, Promise<VietnamDistrict[]>>()

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error("Unable to load Vietnam address data")
  }
  return response.json() as Promise<T>
}

export const vietnamAddressService = {
  listProvinces(): Promise<VietnamProvince[]> {
    provincePromise ??= fetchJson<VietnamProvince[]>(`${BASE_URL}/p/`)
    return provincePromise
  },

  listDistricts(provinceCode: number): Promise<VietnamDistrict[]> {
    const existing = districtPromises.get(provinceCode)
    if (existing) return existing

    const request = fetchJson<VietnamProvince>(`${BASE_URL}/p/${provinceCode}?depth=2`)
      .then((province) => province.districts ?? [])
    districtPromises.set(provinceCode, request)
    return request
  },
}
