export type RegistrationCategory = {
  id: string;
  name: string;
  sportId: string;
  discipline?: string | null;
  uniform?: string | null;
  sport?: { name: string };
};

export function registrationDisciplineKey(category: RegistrationCategory): string {
  const discipline = category.discipline === 'FULL_CONTACT' ? 'CONTACT' : category.discipline;
  return `${category.sportId}:${discipline || 'DEFAULT'}:${discipline === 'NEWAZA' ? category.uniform || 'GI' : ''}`;
}

export function registrationDisciplineLabel(category: RegistrationCategory): string {
  if (category.discipline === 'NEWAZA') return category.uniform === 'NO_GI' ? 'No-Gi Jiu-Jitsu' : 'Gi Jiu-Jitsu';
  const labels: Record<string, string> = { FIGHTING: 'Fighting', DUO: 'Duo', SHOW: 'Show', CONTACT: 'Contact', FULL_CONTACT: 'Contact' };
  return labels[category.discipline || ''] || category.sport?.name || 'Nội dung thi đấu';
}
