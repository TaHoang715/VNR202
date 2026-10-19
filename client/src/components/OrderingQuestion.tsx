import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export interface OrderingItem {
  id: string;
  text: string;
}

interface OrderingQuestionProps {
  items: OrderingItem[];
  currentOrder: string[];
  onChangeOrder: (newOrder: string[]) => void;
  disabled?: boolean;
  correctOrder?: string[];
  isRevealed?: boolean;
}

export const OrderingQuestion: React.FC<OrderingQuestionProps> = ({
  items,
  currentOrder,
  onChangeOrder,
  disabled = false,
  correctOrder,
  isRevealed = false,
}) => {
  const itemMap = React.useMemo(() => {
    const map = new Map<string, OrderingItem>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  const moveUp = (index: number) => {
    if (disabled || index <= 0) return;
    const next = [...currentOrder];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChangeOrder(next);
  };

  const moveDown = (index: number) => {
    if (disabled || index >= currentOrder.length - 1) return;
    const next = [...currentOrder];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChangeOrder(next);
  };

  return (
    <div className="space-y-3 w-full" role="region" aria-label="Sắp xếp trình tự thời gian">
      <div className="text-xs text-[#6e6761] italic flex items-center justify-between">
        <span>Sử dụng nút bấm <strong>Lên</strong> / <strong>Xuống</strong> để sắp xếp theo đúng trình tự thời gian:</span>
        <span className="font-mono text-[11px] font-semibold text-[#9d242b]">1 = Sớm nhất</span>
      </div>

      <div className="space-y-2.5">
        {currentOrder.map((id, index) => {
          const item = itemMap.get(id);
          if (!item) return null;

          const isFirst = index === 0;
          const isLast = index === currentOrder.length - 1;

          // Status indicator in reveal mode
          let borderClass = 'border-[#dfd6c6] bg-white';
          if (isRevealed && correctOrder) {
            const isCorrectPosition = correctOrder[index] === id;
            borderClass = isCorrectPosition
              ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-400'
              : 'border-rose-400 bg-rose-50/70 text-rose-950 ring-1 ring-rose-300';
          }

          return (
            <div
              key={id}
              className={`p-3.5 sm:p-4 rounded-xl border ${borderClass} shadow-sm flex items-center gap-3 sm:gap-4 transition-all duration-150`}
            >
              {/* Position Badge */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 shadow-inner ${
                  isRevealed && correctOrder
                    ? correctOrder[index] === id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                    : 'bg-[#9d242b] text-white'
                }`}
                aria-label={`Vị trí ${index + 1}`}
              >
                {index + 1}
              </div>

              {/* Event / Milestone Text */}
              <div className="flex-1 text-xs sm:text-sm font-medium text-[#171513] leading-relaxed select-none">
                {item.text}
              </div>

              {/* Reordering Buttons */}
              {!disabled && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={isFirst || disabled}
                    aria-label={`Di chuyển mục "${item.text.slice(0, 20)}" lên trên`}
                    className={`p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      isFirst || disabled
                        ? 'text-gray-300 bg-gray-100 cursor-not-allowed'
                        : 'text-[#193b32] bg-[#ede7dc] hover:bg-[#dfd6c6] active:scale-95'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Lên</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={isLast || disabled}
                    aria-label={`Di chuyển mục "${item.text.slice(0, 20)}" xuống dưới`}
                    className={`p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      isLast || disabled
                        ? 'text-gray-300 bg-gray-100 cursor-not-allowed'
                        : 'text-[#193b32] bg-[#ede7dc] hover:bg-[#dfd6c6] active:scale-95'
                    }`}
                  >
                    <ArrowDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Xuống</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
