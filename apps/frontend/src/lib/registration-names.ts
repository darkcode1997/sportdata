export function capitalizeRegistrationName(value: string): string {
  return value.normalize('NFC').replace(/(^|[\s-])\p{L}/gu, (match) => match.toLocaleUpperCase('vi'));
}
