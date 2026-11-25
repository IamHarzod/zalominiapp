import React, { useEffect, useState } from 'react';
import { Box, Header, Icon, Page, Select, Text } from 'zmp-ui';
import { AppBottomNavigation } from '@/components/bottom-nav';
import apiService from '@/services/api.service';

const { Option } = Select;

export default function HistoryPage() {
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [records, setRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [histRes, clsRes] = await Promise.all([
          apiService.get('/attendance/my-history'),
          apiService.get('/classes'),
        ]);
        setRecords(histRes.data.data || []);
        setClasses(clsRes.data.data || []);
      } catch {
        // Fallback nếu chưa kết nối backend
      }
    };
    fetchData();
  }, []);

  const filteredRecords =
    selectedClass === 'ALL'
      ? records
      : records.filter((r) => r.session?.classId === selectedClass);

  const presentCount = filteredRecords.filter((r) => r.status === 'PRESENT').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'LATE').length;
  const absentCount = filteredRecords.filter((r) => r.status === 'ABSENT').length;

  const activeClassRisk =
    classes.find((c) => c.id === selectedClass)?.aiRiskLevel || 'SAFE';

  const getRiskBadge = (level: string) => {
    if (level === 'CRITICAL') {
      return (
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
          ⚠️ Nguy cơ Cấm thi (CRITICAL)
        </span>
      );
    }
    if (level === 'WARNING') {
      return (
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          ⚡ Cần lưu ý (WARNING)
        </span>
      );
    }
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
        ✅ Chuyên cần Tốt (SAFE)
      </span>
    );
  };

  const progressPercent =
    filteredRecords.length > 0
      ? Math.round(((presentCount + lateCount) / filteredRecords.length) * 100)
      : 100;

  return (
    <Page className="bg-slate-50 pb-20">
      <Header title="Lịch sử Chuyên cần" showBackIcon={false} />

      <Box className="space-y-4 px-4 pt-16">
        {/* Thanh tiến trình cảnh báo nguy cơ cấm thi (ai_risk_level) */}
        <Box className="rounded-2xl bg-white p-4 shadow-sm">
          <Box className="flex items-center justify-between">
            <Text.Title size="small" className="font-bold text-slate-800">
              Cảnh báo Cấm thi AI
            </Text.Title>
            {getRiskBadge(activeClassRisk)}
          </Box>

          <Box className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <Box
              className={`h-full rounded-full transition-all ${
                activeClassRisk === 'CRITICAL'
                  ? 'bg-rose-500'
                  : activeClassRisk === 'WARNING'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </Box>

          <Box className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Box className="rounded-lg bg-emerald-50 p-2">
              <Text className="text-base font-bold text-emerald-700">{presentCount}</Text>
              <Text size="xxSmall" className="text-emerald-600">Có mặt</Text>
            </Box>
            <Box className="rounded-lg bg-amber-50 p-2">
              <Text className="text-base font-bold text-amber-700">{lateCount}</Text>
              <Text size="xxSmall" className="text-amber-600">Đi muộn</Text>
            </Box>
            <Box className="rounded-lg bg-rose-50 p-2">
              <Text className="text-base font-bold text-rose-700">{absentCount}</Text>
              <Text size="xxSmall" className="text-rose-600">Vắng</Text>
            </Box>
          </Box>
        </Box>

        <Select
          label="Lọc theo môn học"
          value={selectedClass}
          onChange={(val) => setSelectedClass(String(val))}
        >
          <Option value="ALL" title="Tất cả môn học" />
          {classes.map((c) => (
            <Option key={c.id} value={c.id} title={`${c.code} - ${c.name}`} />
          ))}
        </Select>

        <Box className="space-y-3">
          {filteredRecords.map((item) => (
            <Box
              key={item.id}
              className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm"
            >
              <Box className="flex items-start justify-between">
                <Box>
                  <Text size="xSmall" className="text-slate-400">
                    {new Date(item.checkinTime).toLocaleDateString('vi-VN')} • Buổi{' '}
                    {item.session?.sessionNumber}
                  </Text>
                  <Text className="mt-0.5 font-bold text-slate-800">
                    {item.session?.classEntity?.name || 'Môn học'}
                  </Text>
                </Box>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    item.status === 'PRESENT'
                      ? 'bg-emerald-100 text-emerald-700'
                      : item.status === 'LATE'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {item.status}
                </span>
              </Box>
              <Box className="mt-2 flex items-center space-x-3 text-xs text-slate-500">
                <span className="flex items-center">
                  <Icon icon="zi-location" size={13} className="mr-1 text-emerald-600" />
                  {item.distanceMeters}m
                </span>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <AppBottomNavigation />
    </Page>
  );
}
