const AREA_ALIASES: Record<string, string> = {
  "tp.hcm": "TP. Hồ Chí Minh",
  "tp. hcm": "TP. Hồ Chí Minh",
  "tp hồ chí minh": "TP. Hồ Chí Minh",
  "tp. hồ chí minh": "TP. Hồ Chí Minh",
  "thành phố hồ chí minh": "TP. Hồ Chí Minh",
  "ho chi minh": "TP. Hồ Chí Minh",
  "hồ chí minh": "TP. Hồ Chí Minh",
  "ha noi": "Hà Nội",
  "hà nội": "Hà Nội",
  "thành phố hà nội": "Hà Nội"
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function keyOf(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeAreaName(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim()
  if (!cleaned) return ""
  return AREA_ALIASES[keyOf(cleaned)] ?? cleaned
}

export function parseApplicableAreas(value?: string | null): string[] {
  if (!value) return []
  const values = value
    .split(",")
    .map((item) => normalizeAreaName(item))
    .filter(Boolean)

  return Array.from(new Set(values))
}

export function serializeApplicableAreas(values: string[]): string {
  const normalized = values
    .map((item) => normalizeAreaName(item))
    .filter(Boolean)

  const deduped = Array.from(new Set(normalized))
  deduped.sort((a, b) => a.localeCompare(b, "vi"))
  return deduped.join(", ")
}
