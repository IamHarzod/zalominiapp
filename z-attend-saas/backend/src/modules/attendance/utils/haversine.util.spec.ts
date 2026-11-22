import { calculateHaversineDistance } from './haversine.util';

describe('Haversine Distance Calculator (Anti-Fraud GPS)', () => {
  it('khoảng cách giữa 2 tọa độ trùng nhau phải bằng 0 mét', () => {
    const distance = calculateHaversineDistance(10.7769, 106.7009, 10.7769, 106.7009);
    expect(distance).toBe(0);
  });

  it('khoảng cách giữa 2 điểm cùng phòng học (dưới 20m) phải chuẩn xác', () => {
    // 2 điểm cách nhau ~15 mét trong khuôn viên trường
    const distance = calculateHaversineDistance(10.77688, 106.70089, 10.77695, 106.70099);
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(25);
  });

  it('phát hiện sinh viên ở nhà (cách trường vài km) và trả khoảng cách lớn', () => {
    // Trường học Quận 1 (10.7769, 106.7009) vs Nhà trọ Gò Vấp (10.8388, 106.6653)
    const distance = calculateHaversineDistance(10.7769, 106.7009, 10.8388, 106.6653);
    // Khoảng cách thực tế ~7.8 km = 7800 mét
    expect(distance).toBeGreaterThan(7000);
    expect(distance).toBeLessThan(9000);
  });
});
