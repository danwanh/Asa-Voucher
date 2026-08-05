import { Users } from "lucide-react"
import { C } from "@/utils/constants"

export function StaffManagementPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: C.indigo + "12" }}>
          <Users className="w-7 h-7" style={{ color: C.indigo }} />
        </div>
        <h1 className="text-xl font-black mb-2" style={{ color: C.indigo }}>Quản lý Nhân viên</h1>
        <p className="text-sm" style={{ color: "#8A8DA8" }}>
          Module này đã loại bỏ toàn bộ dữ liệu mock. API quản lý nhân viên theo đối tác sẽ được kết nối khi backend cung cấp endpoint tương ứng cho partner owner.
        </p>
      </div>
    </div>
  )
}
