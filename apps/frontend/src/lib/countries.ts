type CountryLike = { id: string; code?: string | null; name?: string | null };

export function findVietnamCountry<T extends CountryLike>(countries: T[]): T | undefined {
  return countries.find((country) => {
    const code = String(country.code || '').trim().toUpperCase();
    const name = String(country.name || '').toLocaleLowerCase('vi')
      .normalize('NFD').replace(/[\u0300-\u036f\s]/g, '');
    return code === 'VN' || code === 'VNM' || code === 'VIE' || name === 'vietnam';
  });
}

export function vietnamCountryId(countries: CountryLike[]): string | undefined {
  return findVietnamCountry(countries)?.id;
}
