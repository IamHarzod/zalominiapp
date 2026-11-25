import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Header,
  Icon,
  Input,
  Modal,
  Page,
  Text,
  useSnackbar,
} from 'zmp-ui';
import { useAtom } from 'jotai';
import {
  accessTokenAtom,
  tempTokenAtom,
  userAtom,
} from '@/state/auth.state';
import apiService from '@/services/api.service';
import {
  getZaloAccessTokenSafe,
  getZaloLocationTokenSafe,
  scanAttendanceQR,
} from '@/services/zalo.service';
import { OnboardingModal } from '@/components/onboarding-modal';
import { AppBottomNavigation } from '@/components/bottom-nav';

export default function HomePage() {
  const [user, setUser] = useAtom(userAtom);
  const [accessToken, setAccessToken] = useAtom(accessTokenAtom);
  const [, setTempToken] = useAtom(tempTokenAtom);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [defaultZaloName, setDefaultZaloName] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Modal giải thích quyền Vị trí & Camera đúng chuẩn chính sách Zalo
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [hasAcceptedPermissionInfo, setHasAcceptedPermissionInfo] = useState(
    localStorage.getItem('zattend_perm_explained') === 'true',
  );

  // Modal nhập giả lập QR khi test trên trình duyệt Desktop
  const [showManualQrModal, setShowManualQrModal] = useState(false);
  const [manualSessionId, setManualSessionId] = useState('');
  const [manualQrToken, setManualQrToken] = useState('');

  const [lastCheckin, setLastCheckin] = useState<{
    message: string;
    distanceMeters: number;
    status: string;
    time: string;
    isSuccess: boolean;
  } | null>(null);

  const { openSnackbar } = useSnackbar();

  useEffect(() => {
    const initAuth = async () => {
      if (accessToken) {
        try {
          const res = await apiService.get('/auth/me');
          setUser(res.data.data);
          return;
        } catch {
          localStorage.removeItem('zattend_access_token');
          setAccessToken(null);
        }
      }

      try {
        const zaloToken = await getZaloAccessTokenSafe();
        const res = await apiService.post('/auth/zalo-login', {
          zaloAccessToken: zaloToken,
        });

        const data = res.data.data;
        if (data.isRegistered) {
          localStorage.setItem('zattend_access_token', data.accessToken);
          setAccessToken(data.accessToken);
          setUser(data.user);
        } else {
          setTempToken(data.tempToken);
          setDefaultZaloName(data.zaloProfile?.name || '');
          setShowOnboarding(true);
        }
      } catch (err: any) {
        console.warn('Auth init skipped:', err?.message);
      }
    };

    initAuth();
  }, []);

  const submitCheckIn = async (sessionId: string, qrToken: string) => {
    setIsScanning(true);
    try {
      const loc = await getZaloLocationTokenSafe();
      const response = await apiService.post('/attendance/check-in', {
        sessionId,
        qrToken,
        locationToken: loc.locationToken,
        devLat: loc.devLat,
        devLng: loc.devLng,
      });

      const resData = response.data.data;
      setLastCheckin({
        isSuccess: true,
        message: resData.message,
        distanceMeters: resData.distanceMeters ?? 0,
        status: resData.status,
        time: new Date().toLocaleTimeString('vi-VN'),
      });
      openSnackbar({
        text: `Điểm danh ${resData.status}! Khoảng cách: ${resData.distanceMeters}m`,
        type: 'success',
        duration: 4000,
      });
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.message ||
        'Điểm danh thất bại. Vui lòng kiểm tra mã QR hoặc vị trí GPS!';
      setLastCheckin({
        isSuccess: false,
        message: errMsg,
        distanceMeters: 0,
        status: 'FAILED',
        time: new Date().toLocaleTimeString('vi-VN'),
      });
      openSnackbar({
        text: errMsg,
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const executeScan = async () => {
    try {
      const scanned = await scanAttendanceQR();
      if (scanned) {
        await submitCheckIn(scanned.sessionId, scanned.qrToken);
      }
    } catch {
      setShowManualQrModal(true);
    }
  };

  const handleScanButtonClick = () => {
    if (!hasAcceptedPermissionInfo) {
      setShowPermissionModal(true);
      return;
    }
    executeScan();
  };

  return (
    <Page className="bg-slate-50 pb-20">
      <Header
        title="Z-Attend Sinh viên"
        showBackIcon={false}
        className="bg-blue-700 text-white"
      />

      {/* Thẻ thông tin sinh viên & trạng thái liên kết MSSV */}
      <Box className="bg-gradient-to-br from-blue-700 to-indigo-800 px-4 pt-16 pb-6 text-white">
        <Box className="flex items-center space-x-3">
          <Avatar
            src={user?.avatarUrl}
            size={52}
            className="border-2 border-white/50 bg-blue-500"
          >
            {user?.fullName?.charAt(0) || 'SV'}
          </Avatar>
          <Box className="flex-1">
            <Text.Title size="normal" className="font-bold text-white">
              {user?.fullName || 'Đang tải hồ sơ...'}
            </Text.Title>
            <Box className="mt-1 flex items-center space-x-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                MSSV: {user?.studentCode || 'Chưa liên kết'}
              </span>
              {user?.studentCode ? (
                <span className="flex items-center rounded-full bg-emerald-500/30 px-2 py-0.5 text-xs text-emerald-100">
                  <Icon icon="zi-check-circle" size={12} className="mr-1" />
                  Đã khóa định danh
                </span>
              ) : (
                <span className="flex items-center rounded-full bg-amber-500/30 px-2 py-0.5 text-xs text-amber-100">
                  Chưa xác thực MSSV
                </span>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Nút Quét QR động & Kết quả khoảng cách Haversine */}
      <Box className="-mt-4 px-4">
        <Box className="rounded-2xl bg-white p-5 shadow-md">
          <Box className="mb-3 flex items-center justify-between">
            <Text.Title size="small" className="font-bold text-slate-800">
              Điểm danh Lớp học
            </Text.Title>
            <span className="flex items-center text-xs font-medium text-emerald-600">
              <Icon icon="zi-location" size={14} className="mr-1" />
              GPS & QR Chống gian lận
            </span>
          </Box>

          <Text size="small" className="mb-4 text-slate-500">
            Quét mã QR động trên máy chiếu giảng đường. Hệ thống sẽ đo khoảng cách Haversine tới tọa độ lớp học.
          </Text>

          <Button
            fullWidth
            size="large"
            loading={isScanning}
            prefixIcon={<Icon icon="zi-qrline" />}
            onClick={handleScanButtonClick}
            className="h-14 rounded-xl bg-blue-600 text-base font-bold shadow-lg shadow-blue-200"
          >
            QUÉT MÃ QR ĐIỂM DANH
          </Button>

          {lastCheckin && (
            <Box
              className={`mt-4 rounded-xl border p-3 ${
                lastCheckin.isSuccess
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-rose-50'
              }`}
            >
              <Box className="flex items-start space-x-2">
                <Icon
                  icon={
                    lastCheckin.isSuccess
                      ? 'zi-check-circle-solid'
                      : 'zi-close-circle-solid'
                  }
                  className={
                    lastCheckin.isSuccess ? 'text-emerald-600' : 'text-rose-600'
                  }
                />
                <Box className="flex-1">
                  <Text
                    size="small"
                    className={`font-semibold ${
                      lastCheckin.isSuccess
                        ? 'text-emerald-800'
                        : 'text-rose-800'
                    }`}
                  >
                    {lastCheckin.message}
                  </Text>
                  <Text size="xSmall" className="mt-0.5 text-slate-600">
                    Lúc {lastCheckin.time}
                    {lastCheckin.isSuccess
                      ? ` • Khoảng cách Haversine: ${lastCheckin.distanceMeters}m (${lastCheckin.status})`
                      : ''}
                  </Text>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Modal giải thích quyền truy cập Vị trí & Camera đúng chuẩn chính sách Zalo */}
      <Modal
        visible={showPermissionModal}
        title="Quyền truy cập Camera & Vị trí"
        description="Để đảm bảo tính minh bạch và chống điểm danh hộ, Z-Attend cần sử dụng:"
        actions={[
          { text: 'Để sau', close: true },
          {
            text: 'Đã hiểu & Tiếp tục',
            highLight: true,
            onClick: () => {
              localStorage.setItem('zattend_perm_explained', 'true');
              setHasAcceptedPermissionInfo(true);
              setShowPermissionModal(false);
              executeScan();
            },
          },
        ]}
      >
        <Box className="space-y-2 pt-2 text-xs text-slate-600">
          <p>📷 <strong>Camera:</strong> Dùng để quét mã QR động trên màn chiếu của giảng viên.</p>
          <p>📍 <strong>Vị trí (GPS):</strong> Chỉ thu thập tại thời điểm bấm điểm danh để xác thực bạn đang ngồi trong phạm vi phòng học.</p>
        </Box>
      </Modal>

      <OnboardingModal
        visible={showOnboarding}
        defaultName={defaultZaloName}
        onSuccess={() => setShowOnboarding(false)}
      />

      <Modal
        visible={showManualQrModal}
        title="Giả lập Quét QR (Desktop Dev)"
        onClose={() => setShowManualQrModal(false)}
        actions={[
          { text: 'Hủy', close: true },
          {
            text: 'Gửi Check-in',
            highLight: true,
            onClick: () => {
              setShowManualQrModal(false);
              if (manualSessionId && manualQrToken) {
                submitCheckIn(manualSessionId, manualQrToken);
              }
            },
          },
        ]}
      >
        <Box className="space-y-3 pt-2">
          <Input
            label="Session ID"
            placeholder="Nhập UUID phiên điểm danh"
            value={manualSessionId}
            onChange={(e) => setManualSessionId(e.target.value)}
          />
          <Input
            label="QR Token (Từ màn chiếu)"
            placeholder="QR_..."
            value={manualQrToken}
            onChange={(e) => setManualQrToken(e.target.value)}
          />
        </Box>
      </Modal>

      <AppBottomNavigation />
    </Page>
  );
}
