const AREA_CANONICAL_GROUPS: Record<string, string[]> = {
  "TP. Hồ Chí Minh": [
    "TP. Hồ Chí Minh",
    "TP.HCM",
    "TP HCM",
    "TP Hồ Chí Minh",
    "Thành phố Hồ Chí Minh",
    "Ho Chi Minh",
    "Hồ Chí Minh"
  ],
  "Hà Nội": [
    "Hà Nội",
    "Ha Noi",
    "Thành phố Hà Nội"
  ]
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function keyOf(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AREA_ALIASES = Object.entries(AREA_CANONICAL_GROUPS).reduce<Record<string, string>>((acc, [canonical, aliases]) => {
  for (const alias of aliases) {
    acc[keyOf(alias)] = canonical;
  }
  return acc;
}, {});

export function normalizeAreaName(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return AREA_ALIASES[keyOf(cleaned)] ?? cleaned;
}

export function parseApplicableAreas(value?: string | null): string[] {
  if (!value) return [];
  const pieces = value
    .split(",")
    .map((part) => normalizeAreaName(part))
    .filter(Boolean);

  return Array.from(new Set(pieces));
}

export function serializeApplicableAreas(values: string[]): string {
  const normalized = values
    .map((value) => normalizeAreaName(value))
    .filter(Boolean);

  const deduped = Array.from(new Set(normalized));
  deduped.sort((a, b) => a.localeCompare(b, "vi"));
  return deduped.join(", ");
}

export function getAreaMatchCandidates(value: string): string[] {
  const canonical = normalizeAreaName(value);
  if (!canonical) return [];
  const aliases = AREA_CANONICAL_GROUPS[canonical] ?? [canonical];
  return Array.from(new Set(aliases.map((item) => item.trim()).filter(Boolean)));
}
