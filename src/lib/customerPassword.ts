const MIN_CUSTOMER_PASSWORD_LENGTH = 6;
const MAX_CUSTOMER_PASSWORD_BYTES = 72;

const passwordByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

export const isValidCustomerPassword = (value: string): boolean => (
  value.length >= MIN_CUSTOMER_PASSWORD_LENGTH
  && value.trim().length > 0
  && passwordByteLength(value) <= MAX_CUSTOMER_PASSWORD_BYTES
  && !value.includes(String.fromCharCode(0))
);

export const customerPasswordRequirements = "كلمة المرور يجب أن تكون 6 خانات على الأقل وألا تكون فراغات فقط.";
