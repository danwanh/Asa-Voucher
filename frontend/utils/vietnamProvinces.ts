export type Province = { code: string; name: string; type: string };
export type Ward = { code: string; name: string; type: string };

const BASE_URL = "https://tinhthanhpho.com/api/v1";

function normalizeText(text: string): string {
  return text.normalize("NFC").trim();
}

const TYPE_ORDER: Record<string, number> = {
  "Thành phố": 0,
  "Tỉnh": 1,
  "Phường": 0,
  "Xã": 1,
  "Đặc khu": 2,
};

function sortByTypeThenName<T extends { name: string; type: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const typeDiff = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name, "vi");
  });
}

export async function fetchProvinces(): Promise<Province[]> {
  const res = await fetch(`${BASE_URL}/new-provinces?limit=100`);
  if (!res.ok) throw new Error("Không thể tải danh sách tỉnh/thành");
  const json = await res.json();
  if (!json.success) throw new Error("Không thể tải danh sách tỉnh/thành");

  const provinces: Province[] = json.data.map((p: any) => ({
    code: p.code,
    name: normalizeText(p.name),
    type: normalizeText(p.type),
  }));
  return sortByTypeThenName(provinces);
}

export async function fetchWardsByProvince(provinceCode: string): Promise<Ward[]> {
  const wardMap = new Map<string, Ward>();
  let page = 1;
  const limit = 200;

  while (true) {
    const res = await fetch(
      `${BASE_URL}/new-provinces/${provinceCode}/wards?page=${page}&limit=${limit}`,
    );
    if (!res.ok) throw new Error("Không thể tải danh sách phường/xã");
    const json = await res.json();
    if (!json.success) throw new Error("Không thể tải danh sách phường/xã");

    for (const w of json.data) {
      wardMap.set(w.code, { code: w.code, name: normalizeText(w.name), type: normalizeText(w.type) });
    }

    const { total } = json.metadata;
    if (wardMap.size >= total || json.data.length === 0) break;
    page += 1;
  }

  return sortByTypeThenName(Array.from(wardMap.values()));
}