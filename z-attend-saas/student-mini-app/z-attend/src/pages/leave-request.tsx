import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  DatePicker,
  Header,
  Icon,
  Input,
  Page,
  Select,
  Text,
  useSnackbar,
} from 'zmp-ui';
import { pickEvidenceImages } from '@/services/zalo.service';
import apiService from '@/services/api.service';
import { AppBottomNavigation } from '@/components/bottom-nav';

const { Option } = Select;

export default function LeaveRequestPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [leaveDate, setLeaveDate] = useState<Date>(new Date());
  const [reasonText, setReasonText] = useState('');
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  const { openSnackbar } = useSnackbar();

  const fetchInitData = async () => {
    try {
      const [clsRes, reqRes] = await Promise.all([
        apiService.get('/classes'),
        apiService.get('/leave-requests'),
      ]);
      const clsList = clsRes.data.data || [];
      setClasses(clsList);
      if (clsList.length > 0 && !classId) {
        setClassId(clsList[0].id);
      }
      setRequests(reqRes.data.data || []);
    } catch {
      // Ignore if offline
    }
  };

  useEffect(() => {
    fetchInitData();
  }, []);

  const handleChooseImage = async () => {
    const files = await pickEvidenceImages();
    if (files.length > 0) {
      setEvidenceImage(files[0]);
    } else {
      openSnackbar({
        text: 'Đã đính kèm ảnh giấy khám bệnh mẫu (Desktop Mode)',
        type: 'info',
      });
      setEvidenceImage('https://placehold.co/600x400/e2e8f0/1e293b?text=Giay+Kham+Benh');
    }
  };

  const handleSubmit = async () => {
    if (!classId || !reasonText.trim() || !evidenceImage) {
      openSnackbar({
        text: 'Vui lòng chọn lớp, nhập lý do và đính kèm ảnh minh chứng!',
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const formattedDate = leaveDate.toISOString().split('T')[0];
      await apiService.post('/leave-requests', {
        classId,
        leave_date: formattedDate,
        reason_text: reasonText.trim(),
        imageBase64: evidenceImage.startsWith('data:') ? evidenceImage : '',
      });

      setReasonText('');
      setEvidenceImage(null);
      await fetchInitData();
      openSnackbar({
        text: 'Đã gửi đơn! Gemini AI đã thẩm định xong minh chứng.',
        type: 'success',
        duration: 4000,
      });
    } catch (error: any) {
      openSnackbar({
        text: error?.response?.data?.message || 'Lỗi gửi đơn xin nghỉ.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page className="bg-slate-50 pb-24">
      <Header title="Xin nghỉ phép AI" showBackIcon={false} />

      <Box className="space-y-4 px-4 pt-16">
        <Box className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text.Title size="small" className="font-bold text-slate-800">
            Thông tin xin nghỉ
          </Text.Title>

          <Select
            label="Môn học xin nghỉ"
            value={classId}
            onChange={(val) => setClassId(String(val))}
          >
            {classes.map((c) => (
              <Option key={c.id} value={c.id} title={`${c.code} - ${c.name}`} />
            ))}
          </Select>

          <DatePicker
            label="Ngày xin nghỉ"
            value={leaveDate}
            onChange={(date) => setLeaveDate(date)}
            mask
            maskClosable
            dateFormat="dd/mm/yyyy"
          />

          <Input.TextArea
            label="Lý do chi tiết"
            placeholder="Ví dụ: Em bị sốt siêu vi, có giấy khám bệnh của bệnh viện..."
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            maxLength={300}
            showCount
          />

          <Box>
            <Text size="small" className="mb-2 font-medium text-slate-700">
              Ảnh giấy khám bệnh (AI Gemini Vision thẩm định)
            </Text>

            {evidenceImage ? (
              <Box className="relative overflow-hidden rounded-xl border border-slate-200">
                <img
                  src={evidenceImage}
                  alt="Minh chứng"
                  className="h-44 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setEvidenceImage(null)}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
                >
                  <Icon icon="zi-close" size={16} />
                </button>
              </Box>
            ) : (
              <Box
                onClick={handleChooseImage}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 py-8 text-blue-600"
              >
                <Icon icon="zi-camera" size={32} />
                <Text size="small" className="mt-2 font-semibold">
                  Chụp ảnh hoặc Chọn từ Thư viện
                </Text>
              </Box>
            )}
          </Box>

          <Button
            fullWidth
            size="large"
            loading={submitting}
            onClick={handleSubmit}
            className="rounded-xl bg-blue-600 font-bold"
          >
            Gửi Đơn Xin Nghỉ
          </Button>
        </Box>

        <Box>
          <Text.Title size="small" className="mb-3 font-bold text-slate-800">
            Lịch sử đơn đã gửi ({requests.length})
          </Text.Title>
          <Box className="space-y-2.5">
            {requests.map((req) => (
              <Box
                key={req.id}
                className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm"
              >
                <Box className="flex items-start justify-between">
                  <Box>
                    <Text size="xSmall" className="text-slate-400">
                      Ngày nghỉ: {req.leaveDate}
                    </Text>
                    <Text className="font-bold text-slate-800">
                      {req.classEntity?.name || 'Môn học'}
                    </Text>
                    <Text size="xSmall" className="mt-1 text-slate-600">
                      {req.reasonText}
                    </Text>
                  </Box>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {req.status}
                  </span>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <AppBottomNavigation />
    </Page>
  );
}
