import React, { useState } from 'react';
import { getServerUrl, setServerUrl, isConvexMode } from '../socket';
import {
  BookOpen,
  Presentation,
  Gamepad2,
  FileText,
  Wifi,
  Settings,
  X,
} from 'lucide-react';

export type ViewType = 'landing' | 'slides' | 'game' | 'appendix';

interface NavbarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onSelectView }) => {
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(getServerUrl());


  const handleSaveServerUrl = () => {
    const trimmed = serverUrlInput.trim();
    if (trimmed) {
      setServerUrl(trimmed);
      window.location.reload();
    }
  };

  const navItems: { view: ViewType; label: string; time: string; icon: React.ReactNode }[] = [
    { view: 'landing', label: 'Tổng quan', time: '', icon: <BookOpen className="w-4 h-4" /> },
    { view: 'slides', label: 'Bài học', time: "15'", icon: <Presentation className="w-4 h-4" /> },
    { view: 'game', label: 'Game', time: "10'", icon: <Gamepad2 className="w-4 h-4" /> },
    { view: 'appendix', label: 'AI & Nguồn', time: '', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#f6f3ed]/92 backdrop-blur-md border-b border-[#dfd6c6] shadow-sm no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo / Course Identity */}
            <div
              className="flex items-center gap-3.5 cursor-pointer group"
              onClick={() => onSelectView('landing')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectView('landing');
                }
              }}
              title="Trở về Trang Tổng Quan"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#9d242b] text-white flex items-center justify-center font-serif font-bold text-base shadow-sm group-hover:bg-[#7a171d] transition-colors border border-[#7a171d]/30">
                VN
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-lg sm:text-xl text-[#171513] leading-none tracking-tight">
                    VNR202
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#faebee] text-[#9d242b] border border-[#9d242b]/20">
                    1946–1950
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#6e6761] font-medium tracking-wide mt-1">
                  Đường lối kháng chiến toàn quốc
                </p>
              </div>
            </div>

            {/* Desktop Navigation Pill Container */}
            <nav className="hidden md:flex items-center p-1.5 bg-[#ede7dc]/70 rounded-full border border-[#dfd6c6]">
              {navItems.map((item) => {
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => onSelectView(item.view)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#9d242b] text-white shadow-sm'
                        : 'text-[#3a3530] hover:text-[#9d242b] hover:bg-white/70'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.time && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#dfd6c6]/80 text-[#6e6761]'
                        }`}
                      >
                        {item.time}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Connection settings */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowConfig(true)}
                className="p-2 rounded-full text-[#6e6761] hover:text-[#9d242b] hover:bg-[#ede7dc] transition-colors"
                title={isConvexMode() ? 'Thông tin kết nối hệ thống' : 'Cấu hình kết nối máy chủ / LAN'}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Pills */}
          <div className="flex md:hidden overflow-x-auto py-2.5 border-t border-[#dfd6c6]/70 gap-2 scrollbar-none">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => onSelectView(item.view)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#9d242b] text-white shadow-sm'
                      : 'text-[#3a3530] bg-[#ede7dc]/80'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.time && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-black/10 text-[#6e6761]'
                      }`}
                    >
                      {item.time}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Server Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#f6f3ed] border border-[#dfd6c6] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#dfd6c6]">
              <h3 className="font-serif font-bold text-lg text-[#171513]">
                {isConvexMode() ? 'Kết nối máy chủ hệ thống' : 'Cấu hình kết nối Game Server'}
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="p-1.5 rounded-full text-[#6e6761] hover:text-[#9d242b] hover:bg-[#ede7dc]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isConvexMode() ? (
              <div className="py-4 space-y-4">
                <div className="p-3.5 bg-[#e8f0ec] border border-[#193b32]/30 text-[#193b32] text-xs rounded-xl flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse flex-shrink-0" />
                  <div>
                    <strong>Hệ thống máy chủ đám mây đang hoạt động</strong>
                    <div className="text-[11px] text-[#2c5347] mt-0.5">
                      Đồng bộ thời gian thực cho phòng chơi & khảo sát lớp học.
                    </div>
                  </div>
                </div>

                <div className="bg-[#fdfcf9] border border-[#dfd6c6] p-3.5 rounded-xl text-xs space-y-1.5 text-[#3a3530]">
                  <div className="font-semibold text-[#193b32] flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-[#193b32]" />
                    <span>Đặc điểm kết nối trực tuyến:</span>
                  </div>
                  <div>• Thiết bị sinh viên kết nối tự động khi quét mã QR hoặc bấm link.</div>
                  <div>• Không yêu cầu nhập địa chỉ IP thủ công hay cấu hình mạng LAN.</div>
                  <div>• Bảo vệ phiên chơi và tự động ngắt kết nối an toàn khi đóng trình duyệt.</div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-[#dfd6c6]">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-5 py-2 text-xs font-semibold bg-[#9d242b] text-white rounded-full hover:bg-[#7a171d] shadow-sm transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <p className="text-xs text-[#3a3530] leading-relaxed">
                  Máy chủ Socket.IO quản lý khảo sát lớp học và phòng chơi dự phòng cục bộ.
                  Khi kết nối nhiều điện thoại trong cùng mạng LAN, nhập địa chỉ IP LAN của máy chủ (ví dụ:{' '}
                  <code className="bg-[#ede7dc] px-1.5 py-0.5 rounded text-[#9d242b] font-mono">
                    http://192.168.1.15:3001
                  </code>
                  ) thay cho localhost để mã QR mở được trên điện thoại.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-[#171513] uppercase tracking-wide mb-1.5">
                    Địa chỉ Socket.IO Server:
                  </label>
                  <input
                    type="text"
                    value={serverUrlInput}
                    onChange={(e) => setServerUrlInput(e.target.value)}
                    placeholder="http://localhost:3001 hoặc IP LAN"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#dfd6c6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9d242b] font-mono"
                  />
                </div>

                <div className="bg-[#fdfcf9] border border-[#dfd6c6] p-3.5 rounded-xl text-xs space-y-1.5 text-[#3a3530]">
                  <div className="font-semibold text-[#193b32] flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-[#193b32]" />
                    <span>Nguyên tắc kết nối cục bộ:</span>
                  </div>
                  <div>• Trạng thái phòng lưu trong RAM server (reset khi restart server).</div>
                  <div>• Tuyệt đối không tự mở tunnel công khai trái phép khi chưa duyệt.</div>
                  <div>• Máy chủ tự động dọn phòng không hoạt động sau 30 phút (TTL).</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#dfd6c6]">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-4 py-2 text-xs font-medium text-[#3a3530] hover:bg-[#ede7dc] rounded-full transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveServerUrl}
                    className="px-5 py-2 text-xs font-semibold bg-[#9d242b] text-white rounded-full hover:bg-[#7a171d] shadow-sm transition-colors"
                  >
                    Lưu & Kết nối lại
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
