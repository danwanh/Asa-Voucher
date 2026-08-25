import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { AppIcon } from "@/components/AppIcon"
import { PartnerLayout, type PartnerPage } from "@/layouts/PartnerLayout"
import { C } from "@/utils/constants"
import type { AppUser, Voucher } from "@/types"
import { partnerService, type PartnerProfile } from "@/services/partnerService"
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

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: "profile"
}

export function PartnerApp({ user, onLogout, initialPage }: Props) {
  const [page, setPage] = useState<PartnerPage>(initialPage ?? "revenue")
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [isPartnerLoading, setIsPartnerLoading] = useState(true)
  // Drafts created in this session (cleared on logout); persists across page nav within the session
  const [sessionDrafts, setSessionDrafts] = useState<Voucher[]>([])

  useEffect(() => {
    if (initialPage === "profile") {
      setPage("profile")
    }
  }, [initialPage])

  useEffect(() => {
    if (user.role === "partner_owner" && page === "create") {
      setPage("vouchers")
    }
  }, [page, user.role])

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
    setPage(v.status === "rejected" ? "voucher-detail" : "edit")
  }
  const goDetail = (v: Voucher) => { setSelectedVoucher(v); setPage("voucher-detail") }

  const handleSaveDraft = (draft: Voucher) => {
    setSessionDrafts((prev) => {
      const exists = prev.findIndex((d) => d.id === draft.id)
      if (exists >= 0) {
        const next = [...prev]; next[exists] = draft; return next
      }
      return [...prev, draft]
    })
    setPage("vouchers")
  }

  const handleEditDraft = (draft: Voucher) => {
    setSelectedVoucher(draft)
    setPage("edit")
  }

  if (isPartnerLoading) {
    return (
      <PartnerLayout user={user} partner={partner} page={page} onNavigate={setPage} onLogout={onLogout}>
        <LoadingState label="Đang tải dữ liệu đối tác..." variant="page" />
      </PartnerLayout>
    )
  }

  return (
    <PartnerLayout user={user} partner={partner} page={page} onNavigate={setPage} onLogout={onLogout}>
      {page === "vouchers" && (
        <PartnerVouchersPage
          partnerId={user.partnerId}
          onCreateNew={() => setPage("create")}
          onEdit={goEdit}
          onDetail={goDetail}
          canCreate={false}
          sessionDrafts={sessionDrafts}
          onEditDraft={handleEditDraft}
        />
      )}
      {page === "create" && user.role !== "partner_owner" && (
        <CreateVoucherPage
          partnerId={user.partnerId}
          partnerName={partner?.businessName}
          onBack={() => setPage("vouchers")}
          onSaveDraft={handleSaveDraft}
        />
      )}
      {page === "edit" && selectedVoucher && (
        <EditVoucherPage
          voucher={selectedVoucher}
          onBack={() => setPage("vouchers")}
          onSave={(v) => {
            setSelectedVoucher(v)
            // If this was a session draft, update it
            setSessionDrafts((prev) => prev.map((d) => d.id === v.id ? v : d))
          }}
        />
      )}
      {page === "voucher-detail" && selectedVoucher && (
        <PartnerVoucherDetailPage voucher={selectedVoucher} onBack={() => setPage("vouchers")} onEdit={goEdit} />
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
