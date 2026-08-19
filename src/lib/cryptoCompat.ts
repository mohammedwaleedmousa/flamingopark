type CryptoWithOptionalRandomUUID = Crypto & {
  randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
};

const cryptoApi = typeof globalThis !== "undefined" ? (globalThis.crypto as CryptoWithOptionalRandomUUID | undefined) : undefined;

const fallbackRandomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`;
  }

  const timestamp = Date.now().toString(16).padStart(12, "0");
  const random = `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.padEnd(20, "0");
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-4${random.slice(0, 3)}-8${random.slice(3, 6)}-${random.slice(6, 18)}` as `${string}-${string}-${string}-${string}-${string}`;
};

if (cryptoApi && typeof cryptoApi.randomUUID !== "function") {
  try {
    Object.defineProperty(cryptoApi, "randomUUID", {
      configurable: true,
      value: fallbackRandomUUID,
    });
  } catch {
    try {
      cryptoApi.randomUUID = fallbackRandomUUID;
    } catch {
      // Some embedded browsers expose a non-extensible Crypto object.
      // Call sites that need an ID should still avoid relying solely on randomUUID.
    }
  }
}

export const safeRandomUUID = () => {
  const currentCrypto = typeof globalThis !== "undefined" ? (globalThis.crypto as CryptoWithOptionalRandomUUID | undefined) : undefined;
  return currentCrypto && typeof currentCrypto.randomUUID === "function" ? currentCrypto.randomUUID() : fallbackRandomUUID();
};
