const OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'exists']);

function coerceValue(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

function buildMetadataMatch(filters = []) {
  const match = {};
  for (const filter of filters) {
    if (!filter || !filter.key || !OPS.has(filter.op)) continue;
    const path = `metadata.${String(filter.key).replace(/^metadata\./, '')}`;
    switch (filter.op) {
      case 'eq':
        match[path] = coerceValue(filter.value);
        break;
      case 'neq':
        match[path] = { $ne: coerceValue(filter.value) };
        break;
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        match[path] = { [`$${filter.op}`]: coerceValue(filter.value) };
        break;
      case 'exists':
        match[path] = { $exists: Boolean(filter.value) };
        break;
      default:
        break;
    }
  }
  return match;
}

module.exports = { buildMetadataMatch, coerceValue, OPS };
