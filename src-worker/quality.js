// Conservative geographic quality checks for postal-code lookups.
// This does not certify elected officials are still in office.
export const normalizePostal = input => String(input || "").toUpperCase().replace(/\s/g, "");
export const isPostalCode = input => /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(input);
export function boundaryAmbiguity(raw, toRep) {
  const centroid = raw.representatives_centroid || [];
  const concordance = raw.representatives_concordance || [];
  const result = [];
  for (const category of ["federal", "provincial", "municipal"]) {
    const districts = items => new Set(items.map(toRep).filter(r => r.level === category)
      .map(r => String(r.district || "").trim().toLowerCase()).filter(Boolean));
    const a = districts(centroid), b = districts(concordance);
    if (a.size > 1 || b.size > 1 ||
      (a.size && b.size && ([...a].some(x => !b.has(x)) || [...b].some(x => !a.has(x))))) {
      result.push(category);
    }
  }
  return result;
}

/**
 * Select one suggested representative per elected office.
 * The postcode centroid is our best available geographic estimate, so its
 * matches take precedence over other districts in the postcode concordance.
 * Keep distinct municipal offices (mayor, borough mayor, councillor, etc.)
 * because they legitimately represent the same resident at once.
 * This is a suggestion, not official address-level verification.
 */
export function preferredRepresentatives(raw, toRep) {
  const selected = new Map();
  const sources = [
    ...(raw.representatives_centroid || []),
    ...(raw.representatives_concordance || [])
  ];
  for (const item of sources) {
    const rep = toRep(item);
    if (!rep.name || !rep.level) continue;
    const office = String(rep.elected_office || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    let slot = rep.level;
    if (rep.level === 'municipal') {
      const borough = /borough|arrondissement/.test(office);
      if (/mayor|maire|mairesse/.test(office)) {
        slot += borough ? '|borough-mayor' : '|mayor';
      } else if (/councill?or|conseiller|conseillere|alderman|echevin/.test(office)) {
        slot += borough ? '|borough-councillor' : '|councillor';
      } else {
        slot += '|' + (office || 'other');
      }
    }
    if (!selected.has(slot)) selected.set(slot, rep);
  }
  return [...selected.values()];
}
