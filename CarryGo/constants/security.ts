export const AUTH_OTP_LENGTH = 6;
export const DELIVERY_OTP_LENGTH = 6;

export function isFixedLengthNumericCode(value: string, length: number) {
  return new RegExp(`^\\d{${length}}$`).test(value);
}
