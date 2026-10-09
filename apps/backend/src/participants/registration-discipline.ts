type DisciplineCategory = {
  sportId: string;
  discipline?: string | null;
  uniform?: string | null;
};

// Gi and No-Gi are separate disciplines; Contact aliases share one entry.
export function registrationDisciplineKey(category: DisciplineCategory): string {
  const discipline = category.discipline === 'FULL_CONTACT' ? 'CONTACT' : category.discipline;
  const uniform = discipline === 'NEWAZA' ? category.uniform || 'GI' : '';
  return `${category.sportId}:${discipline || 'DEFAULT'}:${uniform}`;
}
