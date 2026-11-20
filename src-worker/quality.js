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
