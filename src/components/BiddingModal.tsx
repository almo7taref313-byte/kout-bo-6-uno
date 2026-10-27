import React from 'react';
import { Player, SuitColor } from '../types';

interface BiddingModalProps {
  step: 'BID' | 'TRUMP';
  highestBid: number;
  bidWinner: number | null;
  players: Player[];
  onBid: (val: number) => void;
  onPass: () => void;
  onPickTrump: (color: SuitColor) => void;
  isDealer?: boolean;
  noBidsYet?: boolean;
}

export const BiddingModal: React.FC<BiddingModalProps> = ({
  step,
  highestBid,
  bidWinner,
  players,
  onBid,
  onPass,
  onPickTrump,
  isDealer = false,
  noBidsYet = false,
}) => {
  const buyer = bidWinner !== null && players ? players[bidWinner] : null;

  return (
    <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-3 pointer-events-auto">
      <div className="bg-[#15181f]/95 border-2 border-emerald-500/40 rounded-3xl w-full max-w-[320px] xs:max-w-[340px] p-3 xs:p-4 text-center shadow-2xl backdrop-blur-md animate-in zoom-in-95">
        
        {step === 'BID' && (
          <div className="w-full flex flex-col gap-2.5">
            
            {/* Team Color Pill of the Bidder who chose the trick number */}
            {buyer && highestBid > 4 && (
              <div
                className="w-full py-1.5 px-3 rounded-2xl flex items-center justify-between shadow-lg border text-white font-black text-xs sm:text-sm animate-pulse"
                style={{
                  backgroundColor: buyer.team === 'A' ? '#1d4ed8' : '#b91c1c',
                  borderColor: buyer.team === 'A' ? '#60a5fa' : '#f87171',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                  <span>{buyer.name}</span>
                  <span className="text-[10px] sm:text-xs font-bold opacity-90">
                    ({buyer.team === 'A' ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴'})
                  </span>
                </div>
                <span className="bg-black/40 px-2 py-0.5 rounded-xl text-xs font-mono font-black border border-white/20">
                  {highestBid === 9 ? 'باون 👑' : `${highestBid}`}
                </span>
              </div>
            )}

            {/* Row 1: Numbers 5, 6, 7, 8 */}
            <div className="grid grid-cols-4 gap-2">
              {[5, 6, 7, 8].map((bid) => {
                const disabled = bid <= highestBid;
                const isClaimed = bid === highestBid && buyer;
                return (
                  <div key={bid} className="relative w-full">
                    <button
                      onClick={() => onBid(bid)}
                      disabled={disabled}
                      className={`w-full py-3 sm:py-3.5 rounded-2xl font-black text-2xl sm:text-3xl text-white transition shadow-lg flex items-center justify-center ${
                        disabled
                          ? isClaimed
                            ? buyer.team === 'A'
                              ? 'bg-blue-900/60 text-blue-200 border-2 border-blue-400 cursor-not-allowed opacity-90'
                              : 'bg-red-900/60 text-red-200 border-2 border-red-400 cursor-not-allowed opacity-90'
                            : 'bg-emerald-950/25 text-white/25 border border-emerald-900/20 opacity-30 cursor-not-allowed'
                          : 'btn-glow-green border border-emerald-300/40 active:scale-95 cursor-pointer hover:brightness-110'
                      }`}
                    >
                      {bid}
                    </button>
                    {isClaimed && (
                      <span
                        className={`absolute -top-1.5 -right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full border border-white shadow text-white ${
                          buyer.team === 'A' ? 'bg-blue-600' : 'bg-rose-600'
                        }`}
                      >
                        {buyer.team === 'A' ? '🔵' : '🔴'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Row 2: باون & طاف */}
            <div className="grid grid-cols-2 gap-2">
              {/* باون (لون ذهبي ملكي مميز بتاج لمنع الضغط بالخطأ) */}
              <div className="relative w-full">
                <button
                  onClick={() => onBid(9)}
                  disabled={highestBid >= 9}
                  className={`w-full py-2.5 sm:py-3 rounded-2xl font-black text-base sm:text-lg transition shadow-lg flex items-center justify-center gap-1.5 ${
                    highestBid >= 9
                      ? highestBid === 9 && buyer
                        ? buyer.team === 'A'
                          ? 'bg-blue-900/60 text-blue-200 border-2 border-blue-400 cursor-not-allowed opacity-90'
                          : 'bg-red-900/60 text-red-200 border-2 border-red-400 cursor-not-allowed opacity-90'
                        : 'bg-amber-950/25 text-amber-200/25 border border-amber-900/20 opacity-30 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 border-2 border-yellow-200/90 active:scale-95 cursor-pointer hover:brightness-110 shadow-lg shadow-amber-500/35 ring-1 ring-amber-300/40'
                  }`}
                >
                  <span className="text-sm sm:text-base">👑</span>
                  <span>باون</span>
                </button>
                {highestBid === 9 && buyer && (
                  <span
                    className={`absolute -top-1.5 -right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full border border-white shadow text-white ${
                      buyer.team === 'A' ? 'bg-blue-600' : 'bg-rose-600'
                    }`}
                  >
                    {buyer.team === 'A' ? '🔵' : '🔴'}
                  </span>
                )}
              </div>

              {/* طاف / ملزوم للموزع */}
              <button
                onClick={onPass}
                className={`border text-white active:scale-95 hover:brightness-110 py-2.5 sm:py-3 rounded-2xl font-black text-sm sm:text-base transition shadow-lg flex items-center justify-center cursor-pointer ${
                  isDealer && noBidsYet
                    ? 'bg-amber-600 hover:bg-amber-500 border-amber-300 ring-2 ring-amber-400/50'
                    : 'btn-glow-green border-emerald-300/40'
                }`}
                title={isDealer && noBidsYet ? 'بصفتك الموزع تصبح ملزوماً بالشراء بـ 5 إذا طوّف الجميع' : 'طاف'}
              >
                {isDealer && noBidsYet ? 'طاف (ملزوم بـ 5) ⚡' : 'طاف'}
              </button>
            </div>
          </div>
        )}

        {step === 'TRUMP' && (
          <div className="w-full flex flex-col gap-2">
            <span className="text-white font-black text-sm mb-1">اختر لون الحكم</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onPickTrump('red')}
                className="bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition text-xs border border-red-400 cursor-pointer"
              >
                <span className="w-3 h-3 rounded-full bg-white shadow"></span>
                <span>أحمر</span>
              </button>
              <button
                onClick={() => onPickTrump('blue')}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition text-xs border border-blue-400 cursor-pointer"
              >
                <span className="w-3 h-3 rounded-full bg-white shadow"></span>
                <span>أزرق</span>
              </button>
              <button
                onClick={() => onPickTrump('green')}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition text-xs border border-emerald-400 cursor-pointer"
              >
                <span className="w-3 h-3 rounded-full bg-white shadow"></span>
                <span>أخضر</span>
              </button>
              <button
                onClick={() => onPickTrump('yellow')}
                className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition text-xs border border-amber-300 cursor-pointer"
              >
                <span className="w-3 h-3 rounded-full bg-slate-900 shadow"></span>
                <span>أصفر</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
