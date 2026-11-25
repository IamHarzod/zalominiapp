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
import { EnrollClassesModal } from '@/components/enroll-classes-modal';
import { AppBottomNavigation } from '@/components/bottom-nav';

export default function HomePage() {
  const [user, setUser] = useAtom(userAtom);
  const [accessToken, setAccessToken] = useAtom(accessTokenAtom);
  const [, setTempToken] = useAtom(tempTokenAtom);

  const [authLoading, setAuthLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [defaultZaloName, setDefaultZaloName] = useState('');
  const [myClasses, setMyClasses] = useState<any[]>([]);
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

  const loadMyClasses = async () => {
    try {
      const res = await apiService.get('/attendance/my-classes');
      const list = res.data.data || [];
      setMyClasses(list);
      return list;
    } catch {
      return [];
    }
  };

  // Tự động khôi phục phiên đăng nhập nếu đã có JWT Token
  useEffect(() => {
    const restoreSession = async () => {
      if (!accessToken) return;
      try {
        const res = await apiService.get('/auth/me');
        setUser(res.data.data);
        const enrolled = await loadMyClasses();
        if (enrolled.length === 0) {
          setShowEnrollModal(true);
        }
      } catch {
        localStorage.removeItem('zattend_access_token');
        setAccessToken(null);
      }
    };
    restoreSession();
  }, []);

  // BƯỚC 1: Đăng nhập bằng Zalo & Cho phép chia sẻ Tên + SĐT
  const handleZaloLogin = async () => {
    setAuthLoading(true);
    try {
      const zaloToken = await getZaloAccessTokenSafe();
      const res = await apiService.post('/auth/zalo/login', {
        zaloAccessToken: zaloToken,
      });

      const data = res.data.data;
      if (data.isRegistered) {
        localStorage.setItem('zattend_access_token', data.accessToken);
        setAccessToken(data.accessToken);
        setUser(data.user);
        const enrolled = await loadMyClasses();
        if (enrolled.length === 0) {
          setShowEnrollModal(true);
        }
      } else {
        // Chuyển sang Bước 2: Khai báo Trường, Lớp, MSSV
        setTempToken(data.tempToken);
        setDefaultZaloName(data.zaloProfile?.name || '');
        setShowOnboarding(true);
      }
    } catch (err: any) {
      openSnackbar({
        text: err?.response?.data?.message || 'Không thể kết nối máy chủ xác thực Zalo.',
        type: 'error',
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // BƯỚC 4: Quét mã QR lớp học để điểm danh
  const submitCheckIn = async (sessionId: string, qrToken: string) => {
    setIsScanning(true);
    try {
      const loc = await getZaloLocationTokenSafe();
      const response = await apiService.post('/attendance/check-in', {
        sessionId,
        qrToken,
        clientLat: loc.lat,
        clientLong: loc.long,
      });

      const resData = response.data.data;
      const dist = resData.record?.distanceMeters ?? 0;
      const st = resData.record?.status ?? 'PRESENT';
      setLastCheckin({
        isSuccess: true,
        message: resData.message,
        distanceMeters: dist,
        status: st,
        time: new Date().toLocaleTimeString('vi-VN'),
      });
      openSnackbar({
        text: `Điểm danh ${st}! Khoảng cách: ${dist}m`,
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

  // MÀN HÌNH BƯỚC 1: Chưa đăng nhập Zalo -> Yêu cầu chia sẻ Tên & Số điện thoại
  if (!user) {
    return (
      <Page className="flex flex-col justify-center bg-gradient-to-br from-blue-700 to-indigo-900 px-6 text-white">
        <Box className="rounded-3xl bg-white p-6 text-center text-slate-800 shadow-2xl">
          <Box className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <Icon icon="zi-qrline" size={32} />
          </Box>
          <Text.Title size="large" className="font-extrabold text-slate-900">
            Z-Attend Sinh viên
          </Text.Title>
          <Text size="small" className="mt-2 text-slate-500">
            Hệ thống điểm danh thông minh bằng QR Động & GPS chống gian lận.
          </Text>

          <Box className="mt-5 rounded-xl bg-blue-50 p-3.5 text-left text-xs text-blue-800 space-y-1.5">
            <p className="font-bold">Bước 1: Xác thực tài khoản Zalo</p>
            <p>Vui lòng cho phép Z-Attend nhận thông tin <strong>Họ tên & Số điện thoại</strong> từ Zalo để định danh sinh viên.</p>
          </Box>

          <Button
            fullWidth
            size="large"
            loading={authLoading}
            onClick={handleZaloLogin}
            className="mt-6 rounded-xl bg-blue-600 font-bold shadow-md"
          >
            Đăng nhập & Chia sẻ thông tin Zalo
          </Button>
        </Box>

        {/* Bước 2: Khai báo Trường, Lớp, MSSV */}
        <OnboardingModal
          visible={showOnboarding}
          defaultName={defaultZaloName}
          onSuccess={() => {
            setShowOnboarding(false);
            setShowEnrollModal(true); // Hoàn tất khai báo -> sang Bước 3: Đăng ký lớp học
          }}
        />
      </Page>
    );
  }

  // MÀN HÌNH BƯỚC 4: Đã khai báo & đăng ký lớp -> Luồng Điểm danh Quét QR
  return (
    <Page className="bg-slate-50 pb-24">
      <Header
        title="Z-Attend Sinh viên"
        showBackIcon={false}
        className="bg-blue-700 text-white"
      />

      {/* Thẻ thông tin sinh viên (Tên, MSSV, Trường, Lớp) */}
      <Box className="bg-gradient-to-br from-blue-700 to-indigo-800 px-4 pt-16 pb-6 text-white">
        <Box className="flex items-center space-x-3">
          <Avatar
            src={user.avatarUrl}
            size={52}
            className="border-2 border-white/50 bg-blue-500"
          >
            {user.fullName?.charAt(0) || 'SV'}
          </Avatar>
          <Box className="flex-1">
            <Text.Title size="normal" className="font-bold text-white">
              {user.fullName}
            </Text.Title>
            <Text size="xxSmall" className="mt-0.5 text-blue-100">
              {user.schoolName || 'Sinh viên'} {user.administrativeClass ? `• Lớp ${user.administrativeClass}` : ''}
            </Text>
            <Box className="mt-1.5 flex items-center space-x-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                MSSV: {user.studentCode}
              </span>
              <span className="flex items-center rounded-full bg-emerald-500/30 px-2 py-0.5 text-xs text-emerald-100">
                <Icon icon="zi-check-circle" size={12} className="mr-1" />
                Đã xác thực
              </span>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Khu vực Quét QR điểm danh */}
      <Box className="-mt-4 px-4">
        <Box className="rounded-2xl bg-white p-5 shadow-md">
          <Box className="mb-3 flex items-center justify-between">
            <Text.Title size="small" className="font-bold text-slate-800">
              Điểm danh Phiên học
            </Text.Title>
            <span className="flex items-center text-xs font-medium text-emerald-600">
              <Icon icon="zi-location" size={14} className="mr-1" />
              Sẵn sàng quét QR
            </span>
          </Box>

          <Text size="small" className="mb-4 text-slate-500">
            Trong mỗi buổi học, bạn chỉ cần hướng camera quét mã QR trên màn chiếu của giảng viên để điểm danh.
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

      {/* Danh sách lớp học đã đăng ký */}
      <Box className="mt-6 px-4">
        <Box className="mb-3 flex items-center justify-between">
          <Text.Title size="small" className="font-bold text-slate-800">
            Lớp học đã đăng ký ({myClasses.length})
          </Text.Title>
          <button
            type="button"
            onClick={() => setShowEnrollModal(true)}
            className="text-xs font-bold text-blue-600"
          >
            + Đăng ký thêm lớp
          </button>
        </Box>

        <Box className="space-y-3">
          {myClasses.map((cls) => (
            <Box
              key={cls.id}
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {cls.code}
              </span>
              <Text className="mt-1.5 font-bold text-slate-800">{cls.name}</Text>
              <Text size="xSmall" className="mt-1 text-slate-500">
                {cls.roomCode} • {cls.lecturerName}
              </Text>
            </Box>
          ))}

          {myClasses.length === 0 && (
            <Box className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <Text size="small" className="text-slate-500">
                Bạn chưa đăng ký lớp học nào.
              </Text>
              <Button
                size="small"
                onClick={() => setShowEnrollModal(true)}
                className="mt-3 bg-blue-600"
              >
                Chọn lớp học ngay
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Bước 3: Modal Đăng ký Lớp học phần */}
      <EnrollClassesModal
        visible={showEnrollModal}
        schoolName={user.schoolName}
        onClose={() => setShowEnrollModal(false)}
        onEnrolled={() => loadMyClasses()}
      />

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
