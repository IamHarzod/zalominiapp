import React, { useState } from 'react';
import { Box, Button, Input, Modal, Text, useSnackbar } from 'zmp-ui';
import { useAtom } from 'jotai';
import {
  accessTokenAtom,
  tempTokenAtom,
  userAtom,
} from '@/state/auth.state';
import apiService from '@/services/api.service';
import { getZaloPhoneTokenSafe } from '@/services/zalo.service';

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
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  const [tempToken] = useAtom(tempTokenAtom);
  const [, setAccessToken] = useAtom(accessTokenAtom);
  const [, setUser] = useAtom(userAtom);
  const { openSnackbar } = useSnackbar();

  const handleBindAccount = async () => {
    if (!studentCode.trim() || !fullName.trim()) {
      openSnackbar({
        text: 'Vui lòng nhập đầy đủ MSSV và Họ tên!',
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
        text: 'Liên kết MSSV & Số điện thoại thành công!',
        type: 'success',
      });
      onSuccess();
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.message ||
        'Không thể liên kết tài khoản. Vui lòng thử lại.';
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
      title="Khóa Định danh Sinh viên"
      description="Tài khoản Zalo này sẽ được gắn cố định với MSSV và Số điện thoại của bạn để chống điểm danh hộ."
    >
      <Box className="space-y-4 pt-2">
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
            Họ và Tên đầy đủ
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
          Chia sẻ SĐT & Kích hoạt
        </Button>
      </Box>
    </Modal>
  );
};

