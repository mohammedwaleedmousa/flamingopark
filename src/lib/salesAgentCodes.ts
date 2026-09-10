export const normalizeSalesAgentCode = (value: string) => value.trim().toUpperCase();

export const isSalesAgentCode = (value: string) => /^FP-\d{3,}$/.test(normalizeSalesAgentCode(value));
