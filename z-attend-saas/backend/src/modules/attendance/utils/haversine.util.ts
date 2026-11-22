/**
 * Chuyển đổi góc từ Độ (Degree) sang Radian
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Tính khoảng cách thực tế giữa 2 tọa độ GPS theo chuẩn Haversine
 * @param lat1 Vĩ độ điểm 1 (VD: Phòng học)
 * @param lon1 Kinh độ điểm 1
 * @param lat2 Vĩ độ điểm 2 (VD: Thiết bị sinh viên)
 * @param lon2 Kinh độ điểm 2
 * @returns Khoảng cách tính bằng mét (m), làm tròn 1 chữ số thập phân
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const EARTH_RADIUS_METERS = 6371000; // Bán kính Trái Đất trung bình: 6,371,000 mét

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  // Áp dụng công thức Haversine
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;

  // Làm tròn 1 chữ số thập phân (Ví dụ: 15.4 m)
  return Math.round(distance * 10) / 10;
}
