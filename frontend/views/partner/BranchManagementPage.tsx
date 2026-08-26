import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Edit2, Lock, Unlock, MapPin, Phone, X, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { AppUser } from "@/types"
import { partnerService, type PartnerBranch, type PartnerProfile } from "@/services/partnerService"
import { fetchProvinces, fetchWardsByProvince, type Province, type Ward } from "@/utils/vietnamProvinces"
import { LoadingState } from "@/components/LoadingState"

type Props = {
  user: AppUser
  partner: PartnerProfile | null
  onPartnerUpdated: (partner: PartnerProfile | null) => void
  embedded?: boolean
}

type FormData = {
  branchName: string
  address: string
  city: string
  ward: string
  phone: string
  isActive: boolean
}

const EMPTY_FORM: FormData = {
  branchName: "",
  address: "",
  city: "",
  ward: "",
  phone: "",
  isActive: true,
}

type DeactivateBranchRequest =
  | { type: "toggle"; branch: PartnerBranch }
  | { type: "form"; branch: PartnerBranch }

export function BranchManagementPage({ user, partner, embedded = false }: Props) {
  const [branches, setBranches] = useState<PartnerBranch[]>([])
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saved, setSaved] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deactivateRequest, setDeactivateRequest] = useState<DeactivateBranchRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [isAddressLoading, setIsAddressLoading] = useState(false)
  const [addressLoadError, setAddressLoadError] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadBranches() {
      if (!partner?.id) {
        if (!isMounted) return
        setBranches([])
        return
      }

      setIsLoading(true)
      try {
        const items = await partnerService.listBranches(partner.id)
        if (!isMounted) return
        setBranches(items)
      } catch {
        if (!isMounted) return
        setBranches([])
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    }

    loadBranches()
    return () => {
      isMounted = false
    }
  }, [partner?.id])

  useEffect(() => {
    let isMounted = true

    async function loadProvinces() {
      if (!showForm || provinces.length > 0 || addressLoadError) return

      setIsAddressLoading(true)
      try {
        const items = await fetchProvinces()
        if (!isMounted) return
        setProvinces(items)
      } catch {
        if (!isMounted) return
        setAddressLoadError(true)
      } finally {
        if (!isMounted) return
        setIsAddressLoading(false)
      }
    }

    void loadProvinces()
    return () => {
      isMounted = false
    }
  }, [addressLoadError, provinces.length, showForm])

  useEffect(() => {
    let isMounted = true

    async function loadWards() {
      if (!showForm || !form.city || provinces.length === 0 || addressLoadError) {
        setWards([])
        return
      }

      const province = provinces.find((item) => item.name === form.city)
      if (!province) {
        setWards([])
        return
      }

      setIsAddressLoading(true)
      try {
        const items = await fetchWardsByProvince(province.code)
        if (!isMounted) return
        setWards(items)
      } catch {
        if (!isMounted) return
        setAddressLoadError(true)
        setWards([])
      } finally {
        if (!isMounted) return
        setIsAddressLoading(false)
      }
    }

    void loadWards()
    return () => {
      isMounted = false
    }
  }, [addressLoadError, form.city, provinces, showForm])

  const filtered = useMemo(
    () =>
      branches.filter((branch) =>
        !search ||
        branch.branchName.toLowerCase().includes(search.toLowerCase()) ||
        branch.address.toLowerCase().includes(search.toLowerCase()),
      ),
    [branches, search],
  )

  const selectedProvince = provinces.find((item) => item.name === form.city)
  const hasCurrentCityOption = Boolean(form.city && provinces.length > 0 && !selectedProvince)
  const selectedWard = wards.find((item) => item.name === form.ward)
  const hasCurrentWardOption = Boolean(form.ward && wards.length > 0 && !selectedWard)

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setWards([])
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (branch: PartnerBranch) => {
    setForm({
      branchName: branch.branchName,
      address: branch.address,
      city: branch.city,
      ward: branch.ward || branch.district,
      phone: branch.phone,
      isActive: branch.isActive,
    })
    setEditId(branch.id)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setDeactivateRequest(null)
  }

  const persistForm = async () => {
    if (!partner?.id) return

    setIsSaving(true)
    try {
      if (editId) {
        const updated = await partnerService.updateBranch(editId, {
          branch_name: form.branchName,
          address: form.address,
          city: form.city,
          ward: form.ward || undefined,
          phone: form.phone || undefined,
          is_active: form.isActive,
        })
        setBranches((prev) => prev.map((item) => (item.id === editId ? updated : item)))
      } else {
        const created = await partnerService.createBranch(partner.id, {
          branch_name: form.branchName,
          address: form.address,
          city: form.city,
          ward: form.ward || undefined,
          phone: form.phone || undefined,
          is_active: form.isActive,
        })
        setBranches((prev) => [created, ...prev])
      }

      closeForm()
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } }
      if (deactivateRequest?.type === "form") {
        setForm((prev) => ({ ...prev, isActive: true }))
      }
      toast.error(err?.response?.data?.error?.message ?? "Không thể lưu chi nhánh")
    } finally {
      setIsSaving(false)
      setDeactivateRequest(null)
    }
  }

  const saveForm = async () => {
    if (!partner?.id) {
      toast.error("Không tìm thấy đối tác hiện tại")
      return
    }

    if (!form.branchName.trim() || !form.address.trim() || !form.city.trim() || !form.ward.trim()) {
      toast.error("Vui lòng nhập đầy đủ tên chi nhánh, địa chỉ, tỉnh/thành và phường/xã")
      return
    }

    if (editId && !form.isActive) {
      const currentBranch = branches.find((branch) => branch.id === editId)
      if (currentBranch?.isActive) {
        setDeactivateRequest({ type: "form", branch: currentBranch })
        return
      }
    }

    await persistForm()
  }

  const performToggleBranchStatus = async (branch: PartnerBranch) => {
    setTogglingId(branch.id)
    try {
      const updated = await partnerService.updateBranch(branch.id, { is_active: !branch.isActive })
      setBranches((prev) => prev.map((item) => (item.id === branch.id ? updated : item)))
      toast.success(updated.isActive ? "Chi nhánh đã hoạt động lại" : "Đã ngưng hoạt động chi nhánh")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } }
      toast.error(err?.response?.data?.error?.message ?? "Không thể cập nhật trạng thái chi nhánh")
    } finally {
      setTogglingId(null)
      setDeactivateRequest(null)
    }
  }

  const toggleBranchStatus = async (branch: PartnerBranch) => {
    if (branch.isActive) {
      setDeactivateRequest({ type: "toggle", branch })
      return
    }

    await performToggleBranchStatus(branch)
  }

  const confirmDeactivateBranch = async () => {
    if (!deactivateRequest) return
    if (deactivateRequest.type === "form") {
      await persistForm()
      return
    }

    await performToggleBranchStatus(deactivateRequest.branch)
  }

  const cancelDeactivateBranch = () => {
    if (deactivateRequest?.type === "form") {
      setForm((prev) => ({ ...prev, isActive: true }))
    }
    setDeactivateRequest(null)
  }

  const isReadOnly = user.role !== "partner_owner" || !partner?.id

  return (
    <div className={embedded ? "mt-6" : "p-6 max-w-5xl mx-auto"}>
      <div className={embedded ? "bg-white rounded-2xl p-6 shadow-sm" : ""}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={embedded ? "text-xl font-black" : "text-2xl font-black"} style={{ color: C.indigo }}>Quản lý Chi nhánh</h1>
            <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>{branches.length} chi nhánh</p>
          </div>
          <button
            onClick={openCreate}
            disabled={isReadOnly}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ backgroundColor: C.peach }}
          >
            <Plus className="w-4 h-4" /> Thêm chi nhánh
          </button>
        </div>

        {saved && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: C.teal + "20", color: "#2D7A52" }}>
            <CheckCircle className="w-4 h-4" /> Đã lưu thay đổi
          </div>
        )}

        {isReadOnly && (
          <div className="mb-4 rounded-xl p-3 text-sm" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
            Chỉ tài khoản chủ đối tác mới được quản lý chi nhánh.
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none bg-white"
            style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
            placeholder="Tìm chi nhánh..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="rounded-2xl p-6 bg-white flex items-center gap-2 text-sm" style={{ color: "#8A8DA8" }}>
            <LoadingState label="Đang tải chi nhánh..." variant="inline" size="sm" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((branch) => (
              <div key={branch.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-black text-sm" style={{ color: C.indigo }}>{branch.branchName}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: branch.isActive ? "#E8F5EE" : "#FEE2E2",
                        color: branch.isActive ? "#2D7A52" : "#B91C1C",
                      }}
                    >
                      {branch.isActive ? "Đang hoạt động" : "Ngưng hoạt động"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button disabled={isReadOnly} onClick={() => openEdit(branch)} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40">
                      <Edit2 className="w-4 h-4" style={{ color: C.indigo }} />
                    </button>
                    <button
                      disabled={isReadOnly || togglingId === branch.id}
                      onClick={() => toggleBranchStatus(branch)}
                      className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40"
                      title={branch.isActive ? "Ngưng hoạt động chi nhánh" : "Kích hoạt lại chi nhánh"}
                      aria-label={branch.isActive ? "Ngưng hoạt động chi nhánh" : "Kích hoạt lại chi nhánh"}
                    >
                      {togglingId === branch.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.peach }} />
                      ) : branch.isActive ? (
                        <Unlock className="w-4 h-4" style={{ color: C.teal }} />
                      ) : (
                        <Lock className="w-4 h-4" style={{ color: C.peach }} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs" style={{ color: "#8A8DA8" }}>
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{branch.address}{branch.ward || branch.district ? `, ${branch.ward || branch.district}` : ""}, {branch.city}</div>
                  {branch.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{branch.phone}</div>}
                </div>
              </div>
            ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <AppIcon name="building" className="w-10 h-10 mb-3 mx-auto" />
                <div className="font-bold" style={{ color: C.indigo }}>Không tìm thấy chi nhánh</div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: C.indigo }}>{editId ? "Chỉnh sửa Chi nhánh" : "Thêm Chi nhánh"}</h2>
              <button onClick={closeForm}><X className="w-5 h-5" style={{ color: "#8A8DA8" }} /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: "branchName", label: "Tên chi nhánh *", placeholder: "Nhập tên chi nhánh" },
                { key: "address", label: "Địa chỉ *", placeholder: "Nhập địa chỉ" },
                { key: "city", label: "Tỉnh/Thành phố *", placeholder: "VD: TP. Hồ Chí Minh" },
                { key: "ward", label: "Phường/Xã *", placeholder: "VD: Phường Sài Gòn" },
                { key: "phone", label: "Điện thoại", placeholder: "VD: 028 1234 5678" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>{field.label}</label>
                  {field.key === "city" && !addressLoadError ? (
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none bg-white"
                      style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                      value={selectedProvince?.code ?? form.city}
                      onChange={(event) => {
                        const province = provinces.find((item) => item.code === event.target.value)
                        setForm((prev) => ({ ...prev, city: province?.name ?? "", ward: "" }))
                      }}
                      disabled={isAddressLoading && provinces.length === 0}
                    >
                      <option value="">{isAddressLoading && provinces.length === 0 ? "Đang tải tỉnh/thành..." : "Chọn tỉnh/thành phố"}</option>
                      {hasCurrentCityOption && <option value={form.city}>{form.city}</option>}
                      {provinces.map((province) => (
                        <option key={province.code} value={province.code}>{province.type} {province.name}</option>
                      ))}
                    </select>
                  ) : field.key === "ward" && !addressLoadError ? (
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none bg-white disabled:bg-gray-50"
                      style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                      value={selectedWard?.code ?? form.ward}
                      onChange={(event) => {
                        const ward = wards.find((item) => item.code === event.target.value)
                        setForm((prev) => ({ ...prev, ward: ward?.name ?? "" }))
                      }}
                      disabled={!form.city || (isAddressLoading && wards.length === 0)}
                    >
                      <option value="">
                        {!form.city
                          ? "Chọn tỉnh/thành phố trước"
                          : isAddressLoading && wards.length === 0
                            ? "Đang tải phường/xã..."
                            : "Chọn phường/xã"}
                      </option>
                      {hasCurrentWardOption && <option value={form.ward}>{form.ward}</option>}
                      {wards.map((ward) => (
                        <option key={ward.code} value={ward.code}>{ward.type} {ward.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                      placeholder={field.placeholder}
                      value={form[field.key as keyof FormData] as string}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                        ...(field.key === "city" ? { ward: "" } : {}),
                      }))}
                      disabled={field.key === "ward" && !addressLoadError && !form.city}
                    />
                  )}
                </div>
              ))}

              <label className="flex items-center gap-2 text-sm" style={{ color: C.indigo }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Chi nhánh đang hoạt động
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border-2 font-bold" style={{ borderColor: "#E2DFC8", color: C.indigo }}>
                Hủy
              </button>
              <button
                onClick={saveForm}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-70"
                style={{ backgroundColor: C.peach }}
              >
                {isSaving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivateRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5" style={{ color: C.peach }} />
              <h3 className="text-lg font-black" style={{ color: C.indigo }}>Ngưng hoạt động chi nhánh?</h3>
            </div>
            <p className="text-sm leading-6" style={{ color: "#5F6278" }}>
              Chi nhánh <span className="font-bold" style={{ color: C.indigo }}>{deactivateRequest.branch.branchName}</span> sẽ chỉ được ngưng hoạt động nếu không còn gắn với voucher đang hoạt động.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={cancelDeactivateBranch}
                disabled={isSaving || togglingId === deactivateRequest.branch.id}
                className="flex-1 py-2.5 rounded-xl border-2 font-bold disabled:opacity-60"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                Hủy
              </button>
              <button
                onClick={confirmDeactivateBranch}
                disabled={isSaving || togglingId === deactivateRequest.branch.id}
                className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-70"
                style={{ backgroundColor: C.peach }}
              >
                {isSaving || togglingId === deactivateRequest.branch.id ? "Đang kiểm tra..." : "Ngưng hoạt động"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
