type CountryLike = { id: string; code?: string | null; name?: string | null };

export function findVietnamCountry<T extends CountryLike>(countries: T[]): T | undefined {
  return countries.find((country) => {
    const code = String(country.code || '').toUpperCase();
    const name = String(country.name || '').trim().toLocaleLowerCase('vi');
    return code === 'VN' || code === 'VNM' || code === 'VIE' || name === 'việt nam' || name === 'vietnam';
  });
}

export function vietnamCountryId(countries: CountryLike[]): string | undefined {
  return findVietnamCountry(countries)?.id;
}
