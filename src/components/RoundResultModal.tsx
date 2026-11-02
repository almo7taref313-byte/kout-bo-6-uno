import React from 'react';
import { Player } from '../types';
import { getMatchTargetAndStatus } from '../utils/gameLogic';

interface RoundResultModalProps {
  buyerWinner: boolean;
  bidWinner: number | null;
  highestBid: number;
  isForcedBid: boolean;
  tricksTeamA: number;
  tricksTeamB: number;
  matchScoreTeamA: number;
  matchScoreTeamB: number;
  roundNumber: number;
  players: Player[];
  humanSeatIndex?: number;
  onNextRound: () => void;
  onReturnToLobby: () => void;
}

export const RoundResultModal: React.FC<RoundResultModalProps> = ({
  buyerWinner,
  bidWinner,
  highestBid,
  isForcedBid,
  tricksTeamA,
  tricksTeamB,
  matchScoreTeamA,
  matchScoreTeamB,
  roundNumber,
  players,
  humanSeatIndex = 0,
  onNextRound,
  onReturnToLobby,
}) => {
  const humanTeam = (humanSeatIndex !== undefined && players[humanSeatIndex]) ? players[humanSeatIndex].team : 'A';
  const buyer = bidWinner !== null ? players[bidWinner] : players[0];
  const buyerTeam = buyer ? buyer.team : 'A';
  const isMyTeamBuyer = buyerTeam === humanTeam;
  const isOpponentBuyer = !isMyTeamBuyer;
  const userWon = (buyerWinner && isMyTeamBuyer) || (!buyerWinner && !isMyTeamBuyer);
  const isBaoon = highestBid === 9;

  // Kuwaiti Kout scoring rule:
  // - Target 101 if both teams have >= 5 points.
  // - Target 51 if either team has < 5 points (Asam).
  // - If win is 51 vs 0: winning team gets "كفو عطيتهم عسم", losing team gets "عطاكم عسم".
  // User Rule:
  // "الباون اذا كان الفريقين قد حازا على ٥ نقاط او اكثر لا يعد الفوز بالباون عسم.
  //  الباون فقط اذا كان اول جولة في اللعبة والفريقين لم يحرزا نقاطا واحرز الفريق ٩ اكلات كاملة يعتبر عسم"
  const matchStatus = getMatchTargetAndStatus(matchScoreTeamA, matchScoreTeamB);
  const { targetScore, bothHaveFiveOrMore, statusTextA, statusTextB } = matchStatus;
  const isAsamFirstRound =
    !bothHaveFiveOrMore &&
    isBaoon &&
    buyerWinner &&
    roundNumber === 1 &&
    (buyerTeam === 'A' ? matchScoreTeamB === 0 : matchScoreTeamA === 0);

  const isZeroAsam = !bothHaveFiveOrMore && (matchStatus.isZeroAsam || isAsamFirstRound);
  const isMatchOver = matchStatus.isMatchOver || isAsamFirstRound;

  const pts = isBaoon ? 36 : highestBid;
  let defensePts = 0;
  if (isBaoon) {
    defensePts = 18;
  } else if (isForcedBid) {
    defensePts = 5;
  } else {
    defensePts = highestBid * 2;
  }
  const earnedPoints = buyerWinner ? pts : defensePts;

  // Title Logic according to Kuwaiti rules:
  // 1- If 51 vs 0 (عسم): "كفو عطيتهم عسم" للفائز و "عطاكم عسم" للخاسر
  // 2- If opposing team was bidder and won: "يابوها"
  // 3- Baoon loss: "يالردي", Baoon win: "كفووووو"
  // 4- Normal loss: "خسرت يا حلو", Normal win: "فزت يا حلو"
  let title = '';
  let icon = '🎉';
  let subTitle = '';
  let titleClass = '';
  let cardBorder = '';

  if (isZeroAsam) {
    if (userWon) {
      title = 'كفو عطيتهم عسم';
      icon = '👑';
      titleClass = 'text-2xl sm:text-3xl font-black text-amber-400 mb-1 animate-bounce';
      subTitle = 'فوز ساحق بـ 51 مقابل 0 (عسم)!';
      cardBorder = 'border-2 border-amber-400 shadow-amber-400/30';
    } else {
      title = 'عطاكم عسم';
      icon = '🎯';
      titleClass = 'text-2xl sm:text-3xl font-black text-rose-500 mb-1 animate-pulse';
      subTitle = 'خسارة بـ 0 مقابل 51 (عسم)!';
      cardBorder = 'border-2 border-rose-500 shadow-rose-500/30';
    }
  } else if (isOpponentBuyer && buyerWinner) {
    title = 'يابوها';
    icon = '💥';
    titleClass = 'text-2xl sm:text-3xl font-black text-rose-500 mb-1 animate-pulse';
    subTitle = isBaoon ? 'يابوها باون كاسح!' : 'يابوها وفازوا بالطلب!';
    cardBorder = 'border-2 border-rose-500';
  } else if (userWon) {
    if (isBaoon) {
      title = 'كفووووو';
      icon = '👑';
      titleClass = 'text-2xl sm:text-3xl font-black text-amber-400 mb-1 animate-bounce';
      subTitle = 'باون كاسح! كفو والله';
    } else {
      title = 'فزت يا حلو';
      icon = '🎉';
      titleClass = 'text-2xl sm:text-3xl font-black text-amber-400 mb-1';
      subTitle = 'ألف مبروك الفوز بالجولة!';
    }
    cardBorder = 'border-2 border-emerald-500';
  } else {
    if (isBaoon) {
      title = 'يالردي';
      icon = '💔';
      titleClass = 'text-2xl sm:text-3xl font-black text-rose-500 mb-1';
      subTitle = 'أكلتم الباون!';
    } else {
      title = 'خسرت يا حلو';
      icon = '❌';
      titleClass = 'text-2xl sm:text-3xl font-black text-rose-500 mb-1';
      subTitle = 'خيرها بغيرها بالجولة القادمة!';
    }
    cardBorder = 'border-2 border-rose-500';
  }

  if (isMatchOver && !isZeroAsam) {
    const userMatchWon = humanTeam === 'A' ? matchScoreTeamA >= targetScore : matchScoreTeamB >= targetScore;
    cardBorder = userMatchWon ? 'border-2 border-amber-500 shadow-amber-500/20' : 'border-2 border-slate-600';
  }

  const forcedNotice = isForcedBid ? ' [ملزوم]' : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 xs:p-3 sm:p-4">
      <div
        className={`bg-slate-900 ${cardBorder} rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md p-3 xs:p-4 sm:p-6 text-center shadow-2xl max-h-[94dvh] overflow-y-auto`}
      >
        <div className="text-3xl sm:text-5xl mb-1 animate-bounce">{icon}</div>
        <h2 className={titleClass}>{title}</h2>
        <p className="text-[10px] sm:text-xs font-bold text-slate-300 mb-2.5">{subTitle}</p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl p-2 xs:p-2.5 sm:p-3.5 mb-2.5 sm:mb-3 shadow-inner">
          <div className="text-[10px] sm:text-[11px] text-slate-400 mb-2 flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span>
              المشتري:{' '}
              <b className="text-amber-300 font-extrabold">
                {buyer ? buyer.name : 'لاعب'} ({buyer && buyer.team === 'A' ? '🔵' : '🔴'})
                {forcedNotice}
              </b>
            </span>
            <span>
              الطلب:{' '}
              <b className="text-white font-extrabold">
                {isBaoon ? 'باون 👑 (9 أكلات)' : `${highestBid} أكلات`}
              </b>
            </span>
          </div>

          {/* Tricks comparison: only circles 🔵 and 🔴 */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-center">
            <div className="bg-blue-950/60 border border-blue-500/50 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-center">
              <span className="text-base sm:text-lg leading-none">🔵</span>
              <div className="text-lg sm:text-xl font-black font-uno text-blue-200 mt-0.5">{tricksTeamA}</div>
              <span className="text-[8px] sm:text-[9px] text-slate-400 block">أكلات</span>
            </div>

            <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-center">
              <span className="text-base sm:text-lg leading-none">🔴</span>
              <div className="text-lg sm:text-xl font-black font-uno text-rose-200 mt-0.5">{tricksTeamB}</div>
              <span className="text-[8px] sm:text-[9px] text-slate-400 block">أكلات</span>
            </div>
          </div>

          {/* Points calculated with circle */}
          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] sm:text-[11px] flex justify-between items-center font-bold">
            <span className="text-slate-300 flex items-center gap-1">
              <span>النقاط المحتسبة:</span>
              {!buyerWinner && (
                <span className="text-[8.5px] sm:text-[9.5px] text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.2 rounded-md font-normal">
                  {isForcedBid ? 'خسارة ملزوم 5 فقط' : `مضاعفة الخسارة: ${highestBid} × 2 = ${defensePts}`}
                </span>
              )}
            </span>
            <span className="text-amber-400 text-xs sm:text-sm font-black flex items-center gap-1">
              <span>+{earnedPoints} نقطة</span>
              <span>{(buyerWinner ? buyerTeam : (buyerTeam === 'A' ? 'B' : 'A')) === 'A' ? '🔵' : '🔴'}</span>
            </span>
          </div>

          {/* Match Score & Target / Asam Status */}
          <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] sm:text-[11px] flex flex-col gap-1 font-bold">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">
                النتيجة (الهدف {targetScore} {bothHaveFiveOrMore ? 'نقطة' : 'عسم'}):
              </span>
              <div className="text-white text-xs sm:text-sm font-uno font-black flex items-center gap-2">
                <span className="flex items-center gap-1 text-blue-300">
                  <span>🔵</span>
                  <span>{matchScoreTeamA}</span>
                </span>
                <span className="text-slate-500">-</span>
                <span className="flex items-center gap-1 text-rose-300">
                  <span>🔴</span>
                  <span>{matchScoreTeamB}</span>
                </span>
              </div>
            </div>

            {/* Asam Badge if 51 vs 0 */}
            {(statusTextA || statusTextB) && (
              <div className="flex items-center justify-center gap-2 mt-1">
                {statusTextA && (
                  <span className="text-[10px] xs:text-[11px] font-black text-amber-300 bg-blue-950/90 border border-blue-400 px-2 py-0.5 rounded-lg animate-pulse">
                    🔵 {statusTextA}
                  </span>
                )}
                {statusTextB && (
                  <span className="text-[10px] xs:text-[11px] font-black text-amber-300 bg-rose-950/90 border border-rose-400 px-2 py-0.5 rounded-lg animate-pulse">
                    🔴 {statusTextB}
                  </span>
                )}
              </div>
            )}

            {/* Dealer status for next round based on score */}
            {!isMatchOver && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-medium flex-wrap">
                <span className="text-slate-300">🃏 توزيع الجولة القادمة:</span>
                {matchScoreTeamA < matchScoreTeamB ? (
                  <span className="text-blue-300 font-bold bg-blue-950/70 border border-blue-500/40 px-2 py-0.5 rounded-md">
                    🔵 على الفريق الأزرق (الأقل سكوراً)
                  </span>
                ) : matchScoreTeamB < matchScoreTeamA ? (
                  <span className="text-rose-300 font-bold bg-rose-950/70 border border-rose-500/40 px-2 py-0.5 rounded-md">
                    🔴 على الفريق الأحمر (الأقل سكوراً)
                  </span>
                ) : (
                  <span className="text-amber-300 font-bold bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded-md">
                    ⚖️ تعادل بالسكور - يستمر التوزيع مع نفس الفريق
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <button
            onClick={onNextRound}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{isMatchOver ? 'مباراة جديدة 🔄' : 'الجولة القادمة 🔄'}</span>
          </button>
          <button
            onClick={onReturnToLobby}
            className="w-full bg-slate-800 hover:bg-rose-900/60 border border-slate-700 text-slate-300 font-bold py-2 sm:py-2.5 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1 shadow cursor-pointer"
          >
            <span>🏠</span>
            <span>الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
