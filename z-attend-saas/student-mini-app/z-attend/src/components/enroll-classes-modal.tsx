import React, { useEffect, useState } from 'react';
import { Box, Button, Icon, Modal, Text, useSnackbar } from 'zmp-ui';
import apiService from '@/services/api.service';

interface AvailableClass {
  id: string;
  code: string;
  name: string;
  roomCode: string;
  lecturerName: string;
  isEnrolled: boolean;
}

interface EnrollClassesModalProps {
  visible: boolean;
  schoolName?: string;
  onClose: () => void;
  onEnrolled: () => void;
}

export const EnrollClassesModal: React.FC<EnrollClassesModalProps> = ({
  visible,
  schoolName,
  onClose,
  onEnrolled,
}) => {
  const [classes, setClasses] = useState<AvailableClass[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { openSnackbar } = useSnackbar();

  const fetchAvailableClasses = async () => {
    try {
      const res = await apiService.get('/attendance/available-classes');
      setClasses(res.data.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAvailableClasses();
    }
  }, [visible]);

  const handleEnroll = async (classId: string) => {
    setLoadingId(classId);
    try {
      const res = await apiService.post('/attendance/enroll', { classId });
      openSnackbar({
        text: res.data.data.message || 'Đăng ký lớp thành công!',
        type: 'success',
      });
      await fetchAvailableClasses();
      onEnrolled();
    } catch (err: any) {
      openSnackbar({
        text: err?.response?.data?.message || 'Không thể đăng ký lớp học.',
        type: 'error',
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      title="Bước 3: Đăng ký Lớp học phần"
      description={
        schoolName
          ? `Các lớp đang mở tại ${schoolName}`
          : 'Chọn lớp học phần bạn đang theo học để bắt đầu điểm danh'
      }
      onClose={onClose}
      actions={[
        {
          text: 'Vào Điểm danh ngay',
          highLight: true,
          close: true,
        },
      ]}
    >
      <Box className="max-h-80 space-y-3 overflow-y-auto pt-2">
        {classes.map((cls) => (
          <Box
            key={cls.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <Box className="flex items-start justify-between gap-2">
              <Box className="flex-1">
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                  {cls.code}
                </span>
                <Text className="mt-1 text-sm font-bold text-slate-800">
                  {cls.name}
                </Text>
                <Text size="xxSmall" className="mt-0.5 text-slate-500">
                  {cls.roomCode} • {cls.lecturerName}
                </Text>
              </Box>
            </Box>

            <Box className="mt-2.5">
              {cls.isEnrolled ? (
                <Button
                  size="small"
                  fullWidth
                  disabled
                  prefixIcon={<Icon icon="zi-check-circle" />}
                  className="bg-emerald-100 text-emerald-700"
                >
                  Đã đăng ký
                </Button>
              ) : (
                <Button
                  size="small"
                  fullWidth
                  loading={loadingId === cls.id}
                  onClick={() => handleEnroll(cls.id)}
                  className="bg-blue-600"
                >
                  Đăng ký lớp này
                </Button>
              )}
            </Box>
          </Box>
        ))}

        {classes.length === 0 && (
          <Text size="small" className="py-6 text-center text-slate-400">
            Đang tải danh sách lớp học...
          </Text>
        )}
      </Box>
    </Modal>
  );
};
