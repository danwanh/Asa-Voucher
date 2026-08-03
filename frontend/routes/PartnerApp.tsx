import { useState } from "react"
import { AppIcon } from "@/components/AppIcon"
import { PartnerLayout, type PartnerPage } from "@/layouts/PartnerLayout"
import { PartnerDashboardPage } from "@/pages/partner/PartnerDashboardPage"
import { PartnerVouchersPage } from "@/pages/partner/PartnerVouchersPage"
import { CreateVoucherPage } from "@/pages/partner/CreateVoucherPage"
import { EditVoucherPage } from "@/pages/partner/EditVoucherPage"
import { PartnerVoucherDetailPage } from "@/pages/partner/PartnerVoucherDetailPage"
import { PartnerRevenuePage } from "@/pages/partner/PartnerRevenuePage"
import { BranchManagementPage } from "@/pages/partner/BranchManagementPage"
import { StaffManagementPage } from "@/pages/partner/StaffManagementPage"
import { BusinessProfilePage } from "@/pages/partner/BusinessProfilePage"
import { PersonalProfilePage } from "@/components/PersonalProfilePage"
import { PartnerSettingsPage } from "@/pages/partner/PartnerSettingsPage"
import { C } from "@/utils/constants"
import type { AppUser, Voucher } from "@/types"

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: "profile"
}

export function PartnerApp({ user, onLogout, initialPage }: Props) {
  const [page, setPage] = useState<PartnerPage>(initialPage ?? "dashboard")
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  // Drafts created in this session (cleared on logout); persists across page nav within the session
  const [sessionDrafts, setSessionDrafts] = useState<Voucher[]>([])

  const goEdit = (v: Voucher) => { setSelectedVoucher(v); setPage("edit") }
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

  return (
    <PartnerLayout user={user} page={page} onNavigate={setPage} onLogout={onLogout}>
      {page === "dashboard" && <PartnerDashboardPage />}
      {page === "vouchers" && (
        <PartnerVouchersPage
          onCreateNew={() => setPage("create")}
          onEdit={goEdit}
          onDetail={goDetail}
          sessionDrafts={sessionDrafts}
          onEditDraft={handleEditDraft}
        />
      )}
      {page === "create" && (
        <CreateVoucherPage
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
      {page === "revenue" && <PartnerRevenuePage />}
      {page === "branches" && <BranchManagementPage />}
      {page === "staff" && <StaffManagementPage />}
      {page === "profile" && (
        <>
          <BusinessProfilePage />
          <PersonalProfilePage user={user} onLogout={onLogout} />
        </>
      )}
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
    </PartnerLayout>
  )
}
