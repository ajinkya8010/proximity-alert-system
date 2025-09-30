// Haversine formula to calculate distance between two points
export function haversineDistance(coords1, coords2) {
  const toRad = (x) => (x * Math.PI) / 180;

  const [lon1, lat1] = coords1; // [lng, lat]
  const [lon2, lat2] = coords2;

  const R = 6371e3; // radius of Earth in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}
