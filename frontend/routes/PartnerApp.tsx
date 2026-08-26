import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { usePathname, useRouter } from "next/navigation"
import { AppIcon } from "@/components/AppIcon"
import { PartnerLayout, type PartnerPage } from "@/layouts/PartnerLayout"
import { C } from "@/utils/constants"
import type { AppUser, Voucher } from "@/types"
import { partnerService, type PartnerProfile } from "@/services/partnerService"
import { voucherService } from "@/services/voucherService"
import { LoadingState } from "@/components/LoadingState"

const pageLoading = () => <LoadingState label="Đang tải trang..." variant="page" />
const PartnerVouchersPage = dynamic(() => import("@/pages/partner/PartnerVouchersPage").then((module) => module.PartnerVouchersPage), { loading: pageLoading })
const CreateVoucherPage = dynamic(() => import("@/pages/partner/CreateVoucherPage").then((module) => module.CreateVoucherPage), { loading: pageLoading })
const EditVoucherPage = dynamic(() => import("@/pages/partner/EditVoucherPage").then((module) => module.EditVoucherPage), { loading: pageLoading })
const PartnerVoucherDetailPage = dynamic(() => import("@/pages/partner/PartnerVoucherDetailPage").then((module) => module.PartnerVoucherDetailPage), { loading: pageLoading })
const PartnerRevenuePage = dynamic(() => import("@/pages/partner/PartnerRevenuePage").then((module) => module.PartnerRevenuePage), { loading: pageLoading })
const StaffCheckVoucherPage = dynamic(() => import("@/pages/staff/StaffCheckVoucherPage").then((module) => module.StaffCheckVoucherPage), { loading: pageLoading })
const BranchManagementPage = dynamic(() => import("@/pages/partner/BranchManagementPage").then((module) => module.BranchManagementPage), { loading: pageLoading })
const StaffManagementPage = dynamic(() => import("@/pages/partner/StaffManagementPage").then((module) => module.StaffManagementPage), { loading: pageLoading })
const BusinessProfilePage = dynamic(() => import("@/pages/partner/BusinessProfilePage").then((module) => module.BusinessProfilePage), { loading: pageLoading })
const PersonalProfilePage = dynamic(() => import("@/components/PersonalProfilePage").then((module) => module.PersonalProfilePage), { loading: pageLoading })
const PartnerSettingsPage = dynamic(() => import("@/pages/partner/PartnerSettingsPage").then((module) => module.PartnerSettingsPage), { loading: pageLoading })

function partnerPageFromPath(pathname: string, fallback: PartnerPage = "revenue"): PartnerPage {
  const segments = pathname.split("/").filter(Boolean)
  const last = segments.at(-1)
  if (last === "profile") return "profile"
  if (last === "new" || last === "create") return "create"
  if (segments[1] === "vouchers" && segments.length >= 3) return last === "edit" ? "edit" : "voucher-detail"
  if (last === "vouchers") return "vouchers"
  if (last === "revenue" || last === "branches" || last === "staff" || last === "check-voucher") return last
  return fallback
}

function voucherIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const voucherId = segments[1] === "vouchers" ? segments[2] : undefined
  return voucherId && !["new", "create", "edit", "detail"].includes(voucherId) ? voucherId : undefined
}

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: PartnerPage
  initialVoucherId?: string
}

function locksPriceAndQuantityFor(voucher?: Voucher | null) {
  return voucher?.status === "active" || voucher?.status === "selling"
}

export function PartnerApp({ user, onLogout, initialPage, initialVoucherId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const page = partnerPageFromPath(pathname, initialPage ?? "revenue")
  const routeVoucherId = voucherIdFromPath(pathname)
  const effectiveVoucherId = routeVoucherId ?? initialVoucherId
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [isVoucherLoading, setIsVoucherLoading] = useState(false)
  const [voucherLoadError, setVoucherLoadError] = useState<string | null>(null)
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [isPartnerLoading, setIsPartnerLoading] = useState(true)
  // Drafts created in this session (cleared on logout); persists across page nav within the session
  const [sessionDrafts, setSessionDrafts] = useState<Voucher[]>([])

  useEffect(() => {
    if (!effectiveVoucherId) {
      setIsVoucherLoading(false)
      setVoucherLoadError(null)
      return
    }

    let isMounted = true
    setIsVoucherLoading(true)
    setVoucherLoadError(null)
    void voucherService.getDetail(effectiveVoucherId)
      .then((detail) => {
        if (!isMounted) return
        setSelectedVoucher(detail.voucher)
      })
      .catch(async () => {
        try {
          const manageDetail = await voucherService.getManageDetail(effectiveVoucherId)
          if (!isMounted) return
          setSelectedVoucher(manageDetail.voucher)
        } catch {
          if (!isMounted) return
          setSelectedVoucher(null)
          setVoucherLoadError("Không thể tải chi tiết voucher.")
        }
      })
      .finally(() => {
        if (isMounted) setIsVoucherLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [effectiveVoucherId])

  useEffect(() => {
    if (user.role === "partner_owner" && page === "create") {
      router.replace("/partner/vouchers")
    }
    if (user.role === "partner_owner" && page === "edit") {
      router.replace(effectiveVoucherId ? `/partner/vouchers/${effectiveVoucherId}` : "/partner/vouchers")
    }
  }, [effectiveVoucherId, page, router, user.role])

  useEffect(() => {
    if (page === "edit" && selectedVoucher && ["rejected", "expired", "locked", "sold_out"].includes(selectedVoucher.status)) {
      router.replace(`/partner/vouchers/${selectedVoucher.id}`)
    }
  }, [page, router, selectedVoucher])

  useEffect(() => {
    let isMounted = true

    async function loadPartner() {
      if (!user.partnerId) {
        if (!isMounted) return
        setPartner(null)
        setIsPartnerLoading(false)
        return
      }

      setIsPartnerLoading(true)
      try {
        const currentPartner = await partnerService.getPartner(user.partnerId)
        if (!isMounted) return
        setPartner(currentPartner)
      } catch {
        if (!isMounted) return
        setPartner(null)
      } finally {
        if (!isMounted) return
        setIsPartnerLoading(false)
      }
    }

    loadPartner()
    return () => {
      isMounted = false
    }
  }, [user.partnerId])

  const goEdit = (v: Voucher) => {
    setSelectedVoucher(v)
    const nextPage = user.role === "partner_owner" || ["rejected", "expired", "locked", "sold_out"].includes(v.status) ? "voucher-detail" : "edit"
    router.push(`/partner/vouchers/${v.id}/${nextPage === "edit" ? "edit" : ""}`.replace(/\/$/, ""))
  }
  const goDetail = (v: Voucher) => {
    setSelectedVoucher(v)
    router.push(`/partner/vouchers/${v.id}`)
  }

  const handleSaveDraft = (draft: Voucher) => {
    setSessionDrafts((prev) => {
      const exists = prev.findIndex((d) => d.id === draft.id)
      if (exists >= 0) {
        const next = [...prev]; next[exists] = draft; return next
      }
      return [...prev, draft]
    })
    router.push("/partner/vouchers")
  }

  const handleEditDraft = (draft: Voucher) => {
    setSelectedVoucher(draft)
    router.push(`/partner/vouchers/${draft.id}/edit`)
  }

  if (isPartnerLoading) {
    return (
      <PartnerLayout user={user} partner={partner} page={page} onNavigate={() => undefined} onLogout={onLogout}>
        <LoadingState label="Đang tải dữ liệu đối tác..." variant="page" />
      </PartnerLayout>
    )
  }

  const voucherRouteFallback = (
    <div className="p-6">
      {isVoucherLoading ? (
        <LoadingState label="Đang tải chi tiết voucher..." variant="page" />
      ) : (
        <div className="rounded-xl border bg-white p-5 text-sm" style={{ borderColor: "#F0EDD8", color: "#C0392B" }}>
          {voucherLoadError ?? "Không tìm thấy voucher."}
        </div>
      )}
    </div>
  )

  return (
    <PartnerLayout user={user} partner={partner} page={page} onNavigate={() => undefined} onLogout={onLogout}>
      {page === "vouchers" && (
        <PartnerVouchersPage
          partnerId={user.partnerId}
          onCreateNew={() => router.push("/partner/vouchers/new")}
          onEdit={goEdit}
          onDetail={goDetail}
          canCreate={false}
          readOnly={user.role === "partner_owner"}
          sessionDrafts={sessionDrafts}
          onEditDraft={handleEditDraft}
        />
      )}
      {page === "create" && user.role !== "partner_owner" && (
        <CreateVoucherPage
          partnerId={user.partnerId}
          partnerName={partner?.businessName}
          onBack={() => router.push("/partner/vouchers")}
          onSaveDraft={handleSaveDraft}
        />
      )}
      {page === "edit" && user.role !== "partner_owner" && (
        selectedVoucher ? (
          <EditVoucherPage
            voucher={selectedVoucher}
            lockPriceAndQuantity={locksPriceAndQuantityFor(selectedVoucher)}
            onBack={() => router.push("/partner/vouchers")}
            onSave={(v) => {
              setSelectedVoucher(v)
              // If this was a session draft, update it
              setSessionDrafts((prev) => prev.map((d) => d.id === v.id ? v : d))
            }}
          />
        ) : voucherRouteFallback
      )}
      {page === "voucher-detail" && (
        selectedVoucher ? (
          <PartnerVoucherDetailPage voucher={selectedVoucher} onBack={() => router.push("/partner/vouchers")} onEdit={goEdit} readOnly={user.role === "partner_owner"} />
        ) : voucherRouteFallback
      )}
      {page === "revenue" && <PartnerRevenuePage partnerId={user.partnerId} partnerName={partner?.businessName} />}
      {page === "check-voucher" && <StaffCheckVoucherPage />}
      {page === "branches" && <BranchManagementPage user={user} partner={partner} onPartnerUpdated={setPartner} />}
      {page === "staff" && <StaffManagementPage />}
      {page === "profile" && (
        <>
          <BusinessProfilePage user={user} partner={partner} onPartnerUpdated={setPartner} />
          <BranchManagementPage user={user} partner={partner} onPartnerUpdated={setPartner} embedded />
          <PersonalProfilePage user={user} onLogout={onLogout} />
        </>
      )}
      {/*
      {page === "notifications" && (
        <div className="p-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-black mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Thông báo</h1>
          <div className="text-center py-16 bg-white rounded-2xl">
            <AppIcon name="bell" className="w-10 h-10 mb-3 mx-auto" />
            <div className="font-bold" style={{ color: C.indigo }}>Không có thông báo mới</div>
          </div>
        </div>
      )}
      {page === "settings" && <PartnerSettingsPage onLogout={onLogout} />}
      */}
    </PartnerLayout>
  )
}
