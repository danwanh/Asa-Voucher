import { useEffect, useState } from "react";
import {
  MapPin,
  Store,
  Search,
  Check,
  X,
  Lock,
  Unlock,
  ChevronRight,
  Plus,
  Pencil,
} from "lucide-react";
import { C, fmtDate } from "@/utils/constants";
import { StatusBadge } from "@/components/StatusBadge";
import {
  partnerService,
  type PartnerProfile,
  type PartnerBranch,
} from "@/services/partnerService";
import {
  fetchProvinces,
  fetchWardsByProvince,
  type Province,
  type Ward,
} from "@/utils/vietnamProvinces";

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  restaurant: "Nhà hàng",
  spa: "Spa",
  entertainment: "Giải trí",
  hotel: "Khách sạn",
  other: "Khác",
};

function PartnerDetail({
  partner,
  branches,
  loadingBranches,
  onBack,
  onReloadBranches,
}: {
  partner: PartnerProfile;
  branches: PartnerBranch[];
  loadingBranches: boolean;
  onBack: () => void;
  onReloadBranches: () => void;
}) {
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<PartnerBranch | null>(null);
  const [savingBranch, setSavingBranch] = useState(false);

  const [branchForm, setBranchForm] = useState({
    branch_name: "",
    address: "",
    city: "",
    ward: "",
    phone: "",
  });

  const [branchError, setBranchError] = useState("");

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    fetchProvinces()
      .then(setProvinces)
      .catch((err) => console.error("Không thể tải danh sách tỉnh/thành:", err));
  }, []);

  async function loadWardsForProvince(provinceCode: string) {
    try {
      setLoadingWards(true);
      const result = await fetchWardsByProvince(provinceCode);
      setWards(result);
    } catch (err) {
      console.error("Không thể tải danh sách phường/xã:", err);
    } finally {
      setLoadingWards(false);
    }
  }

  function handleProvinceChange(provinceCode: string) {
    const province = provinces.find((p) => p.code === provinceCode);
    setBranchForm({ ...branchForm, city: province?.name ?? "", ward: "" });
    setWards([]);
    if (province) loadWardsForProvince(province.code);
  }

  function openCreateBranch() {
    setEditingBranch(null);
    setBranchForm({
      branch_name: "",
      address: "",
      city: "",
      ward: "",
      phone: "",
    });
    setWards([]);
    setShowBranchForm(true);
  }

  function openEditBranch(branch: PartnerBranch) {
    setEditingBranch(branch);
    setBranchForm({
      branch_name: branch.branchName,
      address: branch.address,
      city: branch.city,
      ward: branch.ward,
      phone: branch.phone,
    });
    setShowBranchForm(true);

    const province = provinces.find((p) => p.name === branch.city);
    if (province) loadWardsForProvince(province.code);
  }

  async function handleSaveBranch() {
    try {
      setSavingBranch(true);

      const input = {
        branch_name: branchForm.branch_name.trim(),
        address: branchForm.address.trim(),
        city: branchForm.city.trim().normalize("NFC"),
        ward: branchForm.ward.trim().normalize("NFC") || undefined,
        phone: branchForm.phone.trim() || undefined,
      };

      if (!input.branch_name || !input.address || !input.city || !input.ward) {
        setBranchError(
          "Vui lòng nhập đầy đủ tên chi nhánh, địa chỉ, tỉnh/thành và phường/xã."
        );
        return;
      }

      if (editingBranch) {
        await partnerService.updateBranch(editingBranch.id, input);
      } else {
        await partnerService.createBranch(partner.id, input);
      }

      setShowBranchForm(false);
      setEditingBranch(null);
      setBranchError("");
      onReloadBranches();
    } catch (error: any) {
        console.error("Không thể lưu chi nhánh:", error);
        console.error("Response:", error?.response);
        console.error("Response data:", error?.response?.data);

        setBranchError(
          error?.response?.data?.error?.message ||
            error?.message ||
            "Không thể lưu chi nhánh. Vui lòng kiểm tra lại thông tin."
        );
      } finally {
      setSavingBranch(false);
    }
  }

  async function handleToggleBranch(branch: PartnerBranch) {
    try {
      await partnerService.updateBranch(branch.id, {
        branch_name: branch.branchName,
        address: branch.address,
        city: branch.city,
        ward: branch.ward || undefined,
        phone: branch.phone || undefined,
        is_active: !branch.isActive,
      });

      onReloadBranches();
    } catch (error) {
      console.error("Không thể cập nhật trạng thái chi nhánh:", error);
    }
  }

  const branchesContent = (() => {
    if (loadingBranches) {
      return (
        <div className="text-sm pl-4" style={{ color: "#8A8DA8" }}>
          Đang tải...
        </div>
      );
    }

    if (branches.length === 0) {
      return (
        <div className="text-sm" style={{ color: "#8A8DA8" }}>
          Chưa có chi nhánh
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {branches.map((branch) => (
          <div key={branch.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm" style={{ color: C.indigo }}>
                  {branch.branchName}
                </div>

                <div
                  className="text-xs mt-1 flex items-center gap-1"
                  style={{ color: "#8A8DA8" }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {branch.address}, {branch.city}
                  {branch.district ? `, ${branch.district}` : ""}
                </div>

                {branch.phone && (
                  <div className="text-xs mt-1" style={{ color: "#8A8DA8" }}>
                    SĐT: {branch.phone}
                  </div>
                )}
              </div>

              <StatusBadge status={branch.isActive ? "active" : "inactive"} />
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => openEditBranch(branch)}
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                style={{ backgroundColor: C.eggshell, color: C.indigo }}
              >
                <Pencil className="w-3.5 h-3.5" /> Sửa
              </button>

              <button
                onClick={() => handleToggleBranch(branch)}
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                style={{
                  backgroundColor: branch.isActive ? "#FCEAEA" : "#E8F5EE",
                  color: branch.isActive ? "#C0392B" : "#2D7A52",
                }}
              >
                {branch.isActive ? (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Ngừng hoạt động
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> Kích hoạt
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  })();

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm font-medium mb-4 mt-4 pl-4 flex items-center gap-2"
        style={{ color: C.indigo }}
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Quay lại
      </button>

      <h2 className="font-black text-lg mb-4 pl-4" style={{ color: C.indigo }}>
        {partner.businessName}
      </h2>

      <div className="bg-card rounded-2xl p-4 mb-4 shadow-sm">
        <div className="text-sm mb-2" style={{ color: "#8A8DA8" }}>
          Mã doanh nghiệp: {partner.businessCode}
        </div>
        <div className="text-sm mb-2" style={{ color: "#8A8DA8" }}>
          MST: {partner.taxNumber || "—"}
        </div>
        <div className="text-sm" style={{ color: "#8A8DA8" }}>
          Loại hình: {partner.businessType ? BUSINESS_TYPE_LABELS[partner.businessType] || partner.businessType : "—"}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 pl-4">
        <button
          onClick={openCreateBranch}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1"
          style={{ backgroundColor: "#2D7A52" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm chi nhánh
        </button>
      </div>

      {branchesContent}

      {showBranchForm ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl p-5 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: C.indigo }}>
                {editingBranch ? "Cập nhật chi nhánh" : "Thêm chi nhánh"}
              </h3>

              <button onClick={() => setShowBranchForm(false)} className="p-2 rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>

            {branchError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {branchError}
              </div>
            )}

            <div className="space-y-3">
              <input
                value={branchForm.branch_name}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, branch_name: e.target.value })
                }
                placeholder="Tên chi nhánh"
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <input
                value={branchForm.address}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, address: e.target.value })
                }
                placeholder="Địa chỉ"
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={provinces.find((p) => p.name === branchForm.city)?.code ?? ""}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Chọn tỉnh/thành</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.type} {p.name}
                    </option>
                  ))}
                </select>

                <select
                  value={wards.find((w) => w.name === branchForm.ward)?.code ?? ""}
                  onChange={(e) => {
                    const ward = wards.find((w) => w.code === e.target.value);
                    setBranchForm({ ...branchForm, ward: ward?.name ?? "" });
                  }}
                  disabled={!branchForm.city || loadingWards}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">{loadingWards ? "Đang tải..." : "Chọn phường/xã"}</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.type} {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <input
                value={branchForm.phone}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, phone: e.target.value })
                }
                placeholder="Số điện thoại"
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowBranchForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: C.eggshell, color: C.indigo }}
              >
                Hủy
              </button>

              <button
                onClick={handleSaveBranch}
                disabled={savingBranch}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: "#2D7A52" }}
              >
                {savingBranch ? "Đang lưu..." : editingBranch ? "Cập nhật" : "Thêm chi nhánh"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PartnerManagementPage() {
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [status, setStatus] = useState("");

  const [selectedPartner, setSelectedPartner] = useState<PartnerProfile | null>(null);

  const [branches, setBranches] = useState<PartnerBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  async function loadPartners() {
    try {
      setLoading(true);

      const result = await partnerService.listPartners({
        approval_status: (approvalStatus as any) || undefined,
        status: (status as any) || undefined,
      });

      setPartners(result.items);
    } catch (error) {
      console.error("Không thể tải danh sách đối tác:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPartners();
  }, [approvalStatus, status]);

  async function handleApproval(
    partnerId: string,
    approvalStatus: "approved" | "rejected",
  ) {
    try {
      const updated = await partnerService.approvePartner(partnerId, approvalStatus);

      setPartners((current) =>
        current.map((p) => (p.id === partnerId ? updated : p)),
      );
    } catch (error) {
      console.error("Không thể cập nhật duyệt đối tác:", error);
    }
  }

  async function handleStatus(
    partnerId: string,
    status: "active" | "suspended" | "closed",
  ) {
    try {
      const updated = await partnerService.updatePartnerStatus(partnerId, status);

      setPartners((current) =>
        current.map((p) => (p.id === partnerId ? updated : p)),
      );
    } catch (error) {
      console.error("Không thể cập nhật trạng thái:", error);
    }
  }

  async function loadBranches(partnerId: string) {
    try {
      setLoadingBranches(true);

      const result = await partnerService.listBranches(partnerId);

      setBranches(result);
    } catch (error) {
      console.error("Không thể tải chi nhánh:", error);
    } finally {
      setLoadingBranches(false);
    }
  }

  if (selectedPartner) {
    return (
      <PartnerDetail
        partner={selectedPartner}
        branches={branches}
        loadingBranches={loadingBranches}
        onBack={() => setSelectedPartner(null)}
        onReloadBranches={() => loadBranches(selectedPartner.id)}
      />
    );
  }

  return (
    <div className="p-4">
      <h2 className="font-black text-lg mb-5" style={{ color: C.indigo }}>
        Quản lý đối tác ({partners.length})
      </h2>

      <div className="bg-card rounded-2xl p-4 mb-5 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#8A8DA8" }}
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên đối tác, mã doanh nghiệp, MST..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          <select
            value={approvalStatus}
            onChange={(e) => setApprovalStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm"
          >
            <option value="">Tất cả duyệt</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="suspended">Đã khóa</option>
            <option value="closed">Đã đóng</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners
          .filter((p) => {
            const keyword = search.trim().toLowerCase();

            if (!keyword) return true;

            return (
              p.businessName.toLowerCase().includes(keyword) ||
              p.businessCode.toLowerCase().includes(keyword) ||
              p.taxNumber?.toLowerCase().includes(keyword)
            );
          })
          .map((p) => {
            const partnerBusinessType = p.businessType ?? "other";

            return (
              <div key={p.id} className="bg-card rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
                      style={{ backgroundColor: C.eggshell }}
                    >
                      {p.logoUrl ? (
                        <img
                          src={p.logoUrl}
                          alt={p.businessName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl"> </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: C.indigo }}>
                        {p.businessName}
                      </div>
                      <div className="text-xs" style={{ color: "#8A8DA8" }}>
                        {BUSINESS_TYPE_LABELS[partnerBusinessType] || partnerBusinessType}
                      </div>
                    </div>
                  </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={p.approvalStatus} />
                  {p.approvalStatus === "approved" && <StatusBadge status={p.status} />}
                </div>
              </div>

              <div className="text-xs mt-2" style={{ color: "#B0B3C8" }}>
                Tham gia: {fmtDate(p.createdAt)}
              </div>

              {p.approvalStatus === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApproval(p.id, "approved")}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "#E8F5EE",
                      color: "#2D7A52",
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Duyệt
                  </button>

                  <button
                    onClick={() => handleApproval(p.id, "rejected")}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "#FCEAEA",
                      color: "#C0392B",
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Từ chối
                  </button>
                </div>
              )}

              {p.approvalStatus === "approved" && (
                <div className="flex gap-2 mt-3">
                  {p.status === "active" ? (
                    <button
                      onClick={() => handleStatus(p.id, "suspended")}
                      className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      style={{
                        backgroundColor: "#FFF3CD",
                        color: "#856404",
                      }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Khóa tài khoản
                    </button>
                  ) : p.status === "suspended" ? (
                    <button
                      onClick={() => handleStatus(p.id, "active")}
                      className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      style={{
                        backgroundColor: "#E8F5EE",
                        color: "#2D7A52",
                      }}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Mở khóa
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      setSelectedPartner(p);
                      loadBranches(p.id);
                    }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    style={{
                      backgroundColor: C.eggshell,
                      color: C.indigo,
                    }}
                  >
                    <Store className="w-3.5 h-3.5" />
                    Chi nhánh
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}