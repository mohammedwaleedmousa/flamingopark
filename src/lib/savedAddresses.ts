export type SavedAddress = {
  id: string;
  label: string;
  name?: string;
  phone?: string;
  city: string;
  address: string;
  notes?: string;
  isDefault?: boolean;
  updatedAt: string;
};

const STORAGE_PREFIX = "saved_addresses_v1";
const LEGACY_CHECKOUT_KEY = "checkout_saved_info_v1";

const keyOf = (ownerKey: string) => `${STORAGE_PREFIX}:${ownerKey}`;

export function getSavedAddresses(ownerKey: string): SavedAddress[] {
  try {
    const raw = localStorage.getItem(keyOf(ownerKey));
    if (!raw) return [];
    const data = JSON.parse(raw) as SavedAddress[];
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export function saveSavedAddresses(ownerKey: string, addresses: SavedAddress[]) {
  localStorage.setItem(keyOf(ownerKey), JSON.stringify(addresses));
}

export function upsertSavedAddress(ownerKey: string, draft: Omit<SavedAddress, "updatedAt">): SavedAddress[] {
  const list = getSavedAddresses(ownerKey);
  const next = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };

  const idx = list.findIndex((a) => a.id === draft.id);
  let updated: SavedAddress[];
  if (idx >= 0) {
    updated = [...list];
    updated[idx] = next;
  } else {
    updated = [next, ...list];
  }

  if (next.isDefault) {
    updated = updated.map((a) => ({ ...a, isDefault: a.id === next.id }));
  }

  saveSavedAddresses(ownerKey, updated);
  return updated;
}

export function removeSavedAddress(ownerKey: string, id: string): SavedAddress[] {
  const list = getSavedAddresses(ownerKey);
  const filtered = list.filter((a) => a.id !== id);
  saveSavedAddresses(ownerKey, filtered);
  return filtered;
}

export function migrateLegacyCheckoutInfo(ownerKey: string): SavedAddress[] {
  const existing = getSavedAddresses(ownerKey);
  if (existing.length > 0) return existing;

  try {
    const raw = localStorage.getItem(LEGACY_CHECKOUT_KEY);
    if (!raw) return existing;
    const legacy = JSON.parse(raw) as {
      name?: string;
      phone?: string;
      city?: string;
      address?: string;
      notes?: string;
    };

    const city = String(legacy.city || "").trim();
    const address = String(legacy.address || "").trim();
    if (!city && !address) return existing;

    const migrated: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: "العنوان الافتراضي",
      name: String(legacy.name || ""),
      phone: String(legacy.phone || ""),
      city,
      address,
      notes: String(legacy.notes || ""),
      isDefault: true,
      updatedAt: new Date().toISOString(),
    };

    saveSavedAddresses(ownerKey, [migrated]);
    return [migrated];
  } catch {
    return existing;
  }
}
