import React, { useEffect, useState } from 'react';
import { Box, Button, Input, Modal, Select, Text, useSnackbar } from 'zmp-ui';
import { useAtom } from 'jotai';
import {
  accessTokenAtom,
  tempTokenAtom,
  userAtom,
} from '@/state/auth.state';
import apiService from '@/services/api.service';
import { getZaloPhoneTokenSafe } from '@/services/zalo.service';

const { Option } = Select;

interface OnboardingModalProps {
  visible: boolean;
  defaultName?: string;
  onSuccess: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  defaultName = '',
  onSuccess,
}) => {
  const [schoolName, setSchoolName] = useState('Trường Đại học Công nghệ Thông tin (UIT)');
  const [administrativeClass, setAdministrativeClass] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  const [tempToken] = useAtom(tempTokenAtom);
  const [, setAccessToken] = useAtom(accessTokenAtom);
  const [, setUser] = useAtom(userAtom);
  const { openSnackbar } = useSnackbar();

  useEffect(() => {
    if (defaultName && !fullName) {
      setFullName(defaultName);
    }
  }, [defaultName]);

  const handleBindAccount = async () => {
    if (
      !schoolName.trim() ||
      !administrativeClass.trim() ||
      !studentCode.trim() ||
      !fullName.trim()
    ) {
      openSnackbar({
        text: 'Vui lòng khai báo đầy đủ Trường, Lớp, MSSV và Họ tên!',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const phoneToken = await getZaloPhoneTokenSafe();
      const response = await apiService.post(
        '/auth/student/bind-profile',
        {
          schoolName: schoolName.trim(),
          administrativeClass: administrativeClass.trim(),
          studentCode: studentCode.trim(),
          fullName: fullName.trim(),
          phoneToken,
        },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        },
      );

      const { accessToken, user } = response.data.data;
      localStorage.setItem('zattend_access_token', accessToken);
      setAccessToken(accessToken);
      setUser(user);

      openSnackbar({
        text: 'Khai báo thông tin sinh viên thành công!',
        type: 'success',
      });
      onSuccess();
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.message ||
        'Không thể cập nhật thông tin. Vui lòng thử lại.';
      openSnackbar({
        text: errMsg,
        type: 'error',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      title="Bước 2: Khai báo Thông tin Sinh viên"
      description="Hoàn tất thông tin trường, lớp và mã sinh viên để tham gia các lớp học."
    >
      <Box className="space-y-3 pt-2">
        <Box>
          <Select
            label="Trường đang theo học"
            value={schoolName}
            onChange={(val) => setSchoolName(String(val))}
          >
            <Option
              value="Trường Đại học Công nghệ Thông tin (UIT)"
              title="ĐH Công nghệ Thông tin (UIT)"
            />
            <Option
              value="Trường Đại học Bách Khoa (HCMUT)"
              title="ĐH Bách Khoa (HCMUT)"
            />
            <Option
              value="Trường Đại học Khoa học Tự nhiên (HCMUS)"
              title="ĐH Khoa học Tự nhiên (HCMUS)"
            />
            <Option
              value="Trường Đại học FPT"
              title="ĐH FPT"
            />
          </Select>
        </Box>

        <Box>
          <Text size="small" className="mb-1 font-medium text-slate-700">
            Lớp sinh hoạt / Ngành
          </Text>
          <Input
            placeholder="Ví dụ: KTPM2021"
            value={administrativeClass}
            onChange={(e) => setAdministrativeClass(e.target.value)}
          />
        </Box>

        <Box>
          <Text size="small" className="mb-1 font-medium text-slate-700">
            Mã số Sinh viên (MSSV)
          </Text>
          <Input
            placeholder="Ví dụ: 2021001"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
          />
        </Box>

        <Box>
          <Text size="small" className="mb-1 font-medium text-slate-700">
            Họ và Tên (từ Zalo)
          </Text>
          <Input
            placeholder="Ví dụ: Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Box>

        <Button
          fullWidth
          loading={loading}
          onClick={handleBindAccount}
          className="mt-2 bg-blue-600"
        >
          Hoàn tất & Chọn Lớp học
        </Button>
      </Box>
    </Modal>
  );
};
