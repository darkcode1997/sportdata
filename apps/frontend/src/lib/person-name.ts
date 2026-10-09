export function capitalizePersonName(value: string) {
  return value.toLocaleLowerCase('vi-VN').replace(
    /(^|[\s\-'’])(\p{L})/gu,
    (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase('vi-VN'),
  );
}
