import React from 'react';
import { BottomNavigation, Icon, useNavigate } from 'zmp-ui';
import { useLocation } from 'react-router-dom';

export const AppBottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === '/history') return 'history';
    if (location.pathname === '/leave-request') return 'leave';
    return 'home';
  };

  return (
    <BottomNavigation
      fixed
      activeKey={getActiveTab()}
      onChange={(key) => {
        if (key === 'home') navigate('/');
        if (key === 'history') navigate('/history');
        if (key === 'leave') navigate('/leave-request');
      }}
      className="border-t border-slate-200 bg-white"
    >
      <BottomNavigation.Item
        key="home"
        label="Điểm danh"
        icon={<Icon icon="zi-qrline" />}
        activeIcon={<Icon icon="zi-qrline" />}
      />
      <BottomNavigation.Item
        key="history"
        label="Chuyên cần"
        icon={<Icon icon="zi-clock-1" />}
        activeIcon={<Icon icon="zi-clock-1-solid" />}
      />
      <BottomNavigation.Item
        key="leave"
        label="Xin nghỉ AI"
        icon={<Icon icon="zi-note" />}
        activeIcon={<Icon icon="zi-note-solid" />}
      />
    </BottomNavigation>
  );
};
