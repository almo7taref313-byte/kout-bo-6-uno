import React from 'react';

export interface AvatarItem {
  id: string;
  title: string;
  attire: string;
  render: () => React.ReactNode;
}

export const AVATARS_CATALOG: AvatarItem[] = [
  {
    id: 'kuwaiti_ghutra_white',
    title: 'غترة بيضاء وعقال',
    attire: 'دشداشة كويتية مع غترة وعقال',
    render: () => (
      <svg viewBox="0 0 160 160" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="kgw_bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="kgw_skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7cdb0" />
            <stop offset="100%" stopColor="#dba582" />
          </linearGradient>
          <linearGradient id="kgw_dishdasha" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="kgw_ghutra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
          <linearGradient id="kgw_agal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="50%" stopColor="#09090b" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>
          <linearGradient id="kgw_shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

        {/* Background */}
        <circle cx="80" cy="80" r="80" fill="url(#kgw_bg)" />

        {/* Ghutra back cape */}
        <path d="M26 68 C20 95, 24 135, 38 160 L122 160 C136 135, 140 95, 134 68 Z" fill="#e2e8f0" />
        <path d="M30 68 C24 95, 28 135, 42 160 L118 160 C132 135, 136 95, 130 68 Z" fill="url(#kgw_ghutra)" />

        {/* Kuwaiti White Dishdasha & Shoulders */}
        <path d="M20 160 C24 128, 48 116, 80 116 C112 116, 136 128, 140 160 Z" fill="url(#kgw_dishdasha)" />
        {/* Kuwaiti Dishdasha Stiff Collar & Buttons */}
        <path d="M68 112 C72 110, 88 110, 92 112 L90 128 C86 130, 74 130, 70 128 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="80" y1="126" x2="80" y2="160" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="1 2" />
        <circle cx="80" cy="134" r="1.5" fill="#94a3b8" />
        <circle cx="80" cy="144" r="1.5" fill="#94a3b8" />
        <circle cx="80" cy="154" r="1.5" fill="#94a3b8" />

        {/* Ghutra front drapery left & right side folds */}
        <path d="M38 48 C28 68, 30 115, 48 140 C42 120, 44 80, 48 54 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />
        <path d="M122 48 C132 68, 130 115, 112 140 C118 120, 116 80, 112 54 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />

        {/* Neck */}
        <rect x="70" y="94" width="20" height="24" rx="6" fill="url(#kgw_skin)" />
        <rect x="70" y="94" width="20" height="10" fill="url(#kgw_shadow)" />

        {/* Face */}
        <ellipse cx="80" cy="74" rx="30" ry="34" fill="url(#kgw_skin)" />

        {/* Ears */}
        <ellipse cx="49" cy="74" rx="4.5" ry="8" fill="#e5ab87" />
        <ellipse cx="111" cy="74" rx="4.5" ry="8" fill="#e5ab87" />

        {/* Eyes & Eyebrows */}
        <path d="M60 62 Q68 58 74 62" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M86 62 Q92 58 100 62" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Eye whites */}
        <ellipse cx="67" cy="68" rx="5" ry="3.5" fill="#ffffff" />
        <ellipse cx="93" cy="68" rx="5" ry="3.5" fill="#ffffff" />
        {/* Irises & Pupils */}
        <circle cx="67.5" cy="68" r="2.8" fill="#3b2518" />
        <circle cx="68" cy="67.5" r="1" fill="#ffffff" />
        <circle cx="93.5" cy="68" r="2.8" fill="#3b2518" />
        <circle cx="94" cy="67.5" r="1" fill="#ffffff" />

        {/* Nose */}
        <path d="M78 65 L77 78 Q77 82 80 82 Q83 82 83 78 L82 65" stroke="#c28867" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <ellipse cx="76" cy="80" rx="1.5" ry="0.8" fill="#b07455" />
        <ellipse cx="84" cy="80" rx="1.5" ry="0.8" fill="#b07455" />

        {/* Neat Kuwaiti Mustache & Beard */}
        <path d="M66 84 Q80 87 94 84 Q80 92 66 84 Z" fill="#1c1917" />
        {/* Smile */}
        <path d="M72 90 Q80 94 88 90" stroke="#a35f43" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Jawline Beard */}
        <path d="M52 74 C52 98, 62 108, 80 108 C98 108, 108 98, 108 74 C104 78, 100 86, 95 96 C88 102, 72 102, 65 96 C60 86, 56 78, 52 74 Z" fill="#1c1917" />

        {/* Ghutra Head Peak & Front fold (المرزام الكويتي) */}
        <path d="M42 54 C46 36, 60 28, 80 28 C100 28, 114 36, 118 54 C108 42, 94 40, 80 41 C66 40, 52 42, 42 54 Z" fill="url(#kgw_ghutra)" />
        {/* Forehead shadow */}
        <path d="M54 50 Q80 58 106 50 Q80 52 54 50 Z" fill="rgba(0,0,0,0.12)" />

        {/* Black Agal (Double rings) with metallic sheen */}
        <ellipse cx="80" cy="38" rx="38" ry="9" fill="none" stroke="url(#kgw_agal)" strokeWidth="6" />
        <ellipse cx="80" cy="42" rx="36" ry="8.5" fill="none" stroke="url(#kgw_agal)" strokeWidth="5.5" />
        <ellipse cx="80" cy="37.5" rx="35" ry="7.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'kuwaiti_shemagh_red',
    title: 'شماغ أحمر وعقال',
    attire: 'دشداشة كويتية مع شماغ أحمر وعقال',
    render: () => (
      <svg viewBox="0 0 160 160" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ksr_bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="ksr_skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5cca8" />
            <stop offset="100%" stopColor="#d59a72" />
          </linearGradient>
          <pattern id="shemagh_pat" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#f8fafc" />
            <path d="M0 0 L3 0 L3 3 L0 3 Z M3 3 L6 3 L6 6 L3 6 Z" fill="#b91c1c" opacity="0.85" />
          </pattern>
        </defs>

        <circle cx="80" cy="80" r="80" fill="url(#ksr_bg)" />

        {/* Shemagh Cape */}
        <path d="M26 66 C20 95, 24 135, 38 160 L122 160 C136 135, 140 95, 134 66 Z" fill="url(#shemagh_pat)" />

        {/* White Kuwaiti Dishdasha */}
        <path d="M20 160 C24 128, 48 116, 80 116 C112 116, 136 128, 140 160 Z" fill="#ffffff" />
        <path d="M68 112 C72 110, 88 110, 92 112 L90 128 C86 130, 74 130, 70 128 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="80" y1="126" x2="80" y2="160" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="1 2" />
        <circle cx="80" cy="136" r="1.5" fill="#94a3b8" />
        <circle cx="80" cy="148" r="1.5" fill="#94a3b8" />

        {/* Shemagh Front wings */}
        <path d="M38 48 C28 68, 30 115, 48 140 C42 120, 44 80, 48 54 Z" fill="url(#shemagh_pat)" />
        <path d="M122 48 C132 68, 130 115, 112 140 C118 120, 116 80, 112 54 Z" fill="url(#shemagh_pat)" />

        {/* Neck */}
        <rect x="70" y="94" width="20" height="24" rx="6" fill="url(#ksr_skin)" />

        {/* Face */}
        <ellipse cx="80" cy="74" rx="29" ry="33" fill="url(#ksr_skin)" />

        {/* Ears */}
        <ellipse cx="50" cy="74" rx="4.5" ry="8" fill="#e0a37c" />
        <ellipse cx="110" cy="74" rx="4.5" ry="8" fill="#e0a37c" />

        {/* Eyes & Eyebrows */}
        <path d="M61 63 Q68 59 74 63" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M86 63 Q92 59 99 63" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <ellipse cx="67" cy="69" rx="5" ry="3.5" fill="#ffffff" />
        <ellipse cx="93" cy="69" rx="5" ry="3.5" fill="#ffffff" />
        <circle cx="67.5" cy="69" r="2.8" fill="#451a03" />
        <circle cx="68" cy="68.5" r="1" fill="#ffffff" />
        <circle cx="93.5" cy="69" r="2.8" fill="#451a03" />
        <circle cx="94" cy="68.5" r="1" fill="#ffffff" />

        {/* Nose */}
        <path d="M78 66 L77 78 Q77 82 80 82 Q83 82 83 78 L82 66" stroke="#bf835e" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Stylish Kuwaiti mustache and chin goatee */}
        <path d="M65 84 Q80 88 95 84 Q80 91 65 84 Z" fill="#1c1917" />
        <ellipse cx="80" cy="98" rx="5" ry="4" fill="#1c1917" />
        {/* Jawline shadow/light beard */}
        <path d="M53 76 C53 98, 63 107, 80 107 C97 107, 107 98, 107 76 C104 80, 100 87, 95 96 C88 102, 72 102, 65 96 C60 87, 56 80, 53 76 Z" fill="#1c1917" />

        {/* Shemagh Top dome */}
        <path d="M42 54 C46 36, 60 28, 80 28 C100 28, 114 36, 118 54 C108 42, 94 40, 80 41 C66 40, 52 42, 42 54 Z" fill="url(#shemagh_pat)" />

        {/* Double Agal */}
        <ellipse cx="80" cy="38" rx="38" ry="9" fill="none" stroke="#09090b" strokeWidth="6" />
        <ellipse cx="80" cy="42" rx="36" ry="8.5" fill="none" stroke="#18181b" strokeWidth="5.5" />
        <ellipse cx="80" cy="37.5" rx="35" ry="7.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'kuwaiti_gahfiya',
    title: 'قحفية كويتية مطرزة',
    attire: 'دشداشة كويتية مع قحفية بيضاء مطرزة',
    render: () => (
      <svg viewBox="0 0 160 160" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="kg_bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="kg_skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8d0b2" />
            <stop offset="100%" stopColor="#d89f77" />
          </linearGradient>
          <linearGradient id="kg_gahfiya" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        <circle cx="80" cy="80" r="80" fill="url(#kg_bg)" />

        {/* Kuwaiti White Dishdasha */}
        <path d="M20 160 C24 124, 48 114, 80 114 C112 114, 136 124, 140 160 Z" fill="#ffffff" />
        {/* Kuwaiti Mandarin Stiff Collar */}
        <path d="M66 108 C70 106, 90 106, 94 108 L92 126 C88 128, 72 128, 68 126 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="80" y1="126" x2="80" y2="160" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="1 2" />
        <circle cx="80" cy="135" r="1.5" fill="#94a3b8" />
        <circle cx="80" cy="146" r="1.5" fill="#94a3b8" />

        {/* Neck */}
        <rect x="70" y="90" width="20" height="26" rx="6" fill="url(#kg_skin)" />

        {/* Face */}
        <ellipse cx="80" cy="74" rx="31" ry="35" fill="url(#kg_skin)" />

        {/* Ears */}
        <ellipse cx="48" cy="74" rx="4.5" ry="8" fill="#e0a37c" />
        <ellipse cx="112" cy="74" rx="4.5" ry="8" fill="#e0a37c" />

        {/* Kuwaiti Gahfiya (Traditional Embroidered Skullcap) */}
        <path d="M48 56 C47 30, 62 18, 80 18 C98 18, 113 30, 112 56 C102 52, 90 50, 80 50 C70 50, 58 52, 48 56 Z" fill="url(#kg_gahfiya)" stroke="#e2e8f0" strokeWidth="1.2" />
        {/* Gahfiya Traditional Embroidery Pattern (Holes & Rings) */}
        <ellipse cx="80" cy="48" rx="28" ry="4" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
        <ellipse cx="80" cy="40" rx="24" ry="3.5" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
        <ellipse cx="80" cy="32" rx="18" ry="3" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
        <ellipse cx="80" cy="24" rx="10" ry="2" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="1.5 1.5" />
        {/* Scalloped edge of Kuwaiti Gahfiya */}
        <path d="M48 56 Q56 53 64 54 Q72 52 80 52 Q88 52 96 54 Q104 53 112 56" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />

        {/* Eyebrows */}
        <path d="M59 63 Q67 59 74 63" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M86 63 Q93 59 101 63" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <ellipse cx="66" cy="69" rx="5" ry="3.5" fill="#ffffff" />
        <ellipse cx="94" cy="69" rx="5" ry="3.5" fill="#ffffff" />
        <circle cx="66.5" cy="69" r="2.8" fill="#1e130c" />
        <circle cx="67" cy="68.5" r="1" fill="#ffffff" />
        <circle cx="94.5" cy="69" r="2.8" fill="#1e130c" />
        <circle cx="95" cy="68.5" r="1" fill="#ffffff" />

        {/* Nose */}
        <path d="M78 66 L77 78 Q77 82 80 82 Q83 82 83 78 L82 66" stroke="#c0825c" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Mustache & Well-groomed Beard */}
        <path d="M65 84 Q80 87 95 84 Q80 92 65 84 Z" fill="#1c1917" />
        <path d="M51 76 C51 98, 62 109, 80 109 C98 109, 109 98, 109 76 C105 80, 101 88, 95 96 C88 102, 72 102, 65 96 C59 88, 55 80, 51 76 Z" fill="#1c1917" />
      </svg>
    ),
  },
  {
    id: 'kuwaiti_dishdasha_plain',
    title: 'دشداشة كويتية رسمية',
    attire: 'دشداشة كويتية رسمية بياقة قلاب',
    render: () => (
      <svg viewBox="0 0 160 160" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="kdp_bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="kdp_skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f9d3b7" />
            <stop offset="100%" stopColor="#dca47e" />
          </linearGradient>
        </defs>

        <circle cx="80" cy="80" r="80" fill="url(#kdp_bg)" />

        {/* Crisp Kuwaiti White Dishdasha */}
        <path d="M20 160 C24 122, 48 112, 80 112 C112 112, 136 122, 140 160 Z" fill="#ffffff" />
        {/* Kuwaiti Traditional Pointed High Collar */}
        <path d="M64 106 C70 104, 90 104, 96 106 L93 126 C88 128, 72 128, 67 126 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="80" y1="126" x2="80" y2="160" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="1 2" />
        <circle cx="80" cy="134" r="1.6" fill="#94a3b8" />
        <circle cx="80" cy="145" r="1.6" fill="#94a3b8" />
        <circle cx="80" cy="156" r="1.6" fill="#94a3b8" />

        {/* Neck */}
        <rect x="70" y="88" width="20" height="26" rx="6" fill="url(#kdp_skin)" />

        {/* Face */}
        <ellipse cx="80" cy="72" rx="31" ry="35" fill="url(#kdp_skin)" />

        {/* Ears */}
        <ellipse cx="48" cy="72" rx="4.5" ry="8" fill="#e0a37c" />
        <ellipse cx="112" cy="72" rx="4.5" ry="8" fill="#e0a37c" />

        {/* Styled Kuwaiti Dark Hair (Neat & Clean Fade) */}
        <path d="M48 54 C46 30, 58 20, 80 20 C102 20, 114 30, 112 54 C104 38, 94 32, 80 32 C66 32, 56 38, 48 54 Z" fill="#171717" />
        {/* Sideburns */}
        <path d="M48 54 L50 68 L53 68 L52 54 Z" fill="#171717" />
        <path d="M112 54 L110 68 L107 68 L108 54 Z" fill="#171717" />

        {/* Eyebrows */}
        <path d="M59 60 Q67 56 74 60" stroke="#171717" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M86 60 Q93 56 101 60" stroke="#171717" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <ellipse cx="66" cy="66" rx="5" ry="3.5" fill="#ffffff" />
        <ellipse cx="94" cy="66" rx="5" ry="3.5" fill="#ffffff" />
        <circle cx="66.5" cy="66" r="2.8" fill="#29190d" />
        <circle cx="67" cy="65.5" r="1" fill="#ffffff" />
        <circle cx="94.5" cy="66" r="2.8" fill="#29190d" />
        <circle cx="95" cy="65.5" r="1" fill="#ffffff" />

        {/* Nose */}
        <path d="M78 63 L77 76 Q77 80 80 80 Q83 80 83 76 L82 63" stroke="#c0825c" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Neat Kuwaiti Mustache & Short Trimmed Beard */}
        <path d="M65 82 Q80 85 95 82 Q80 90 65 82 Z" fill="#171717" />
        <path d="M51 74 C51 96, 62 107, 80 107 C98 107, 109 96, 109 74 C105 78, 101 86, 95 94 C88 100, 72 100, 65 94 C59 86, 55 78, 51 74 Z" fill="#171717" />
      </svg>
    ),
  },
  {
    id: 'kuwaiti_gahfiya_glasses',
    title: 'قحفية كويتية ونظارة',
    attire: 'دشداشة كويتية مع قحفية ونظارة',
    render: () => (
      <svg viewBox="0 0 160 160" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="kgg_bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="kgg_skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8d1b5" />
            <stop offset="100%" stopColor="#dca581" />
          </linearGradient>
        </defs>

        <circle cx="80" cy="80" r="80" fill="url(#kgg_bg)" />

        {/* White Kuwaiti Dishdasha */}
        <path d="M20 160 C24 124, 48 114, 80 114 C112 114, 136 124, 140 160 Z" fill="#ffffff" />
        <path d="M66 108 C70 106, 90 106, 94 108 L92 126 C88 128, 72 128, 68 126 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="80" y1="126" x2="80" y2="160" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="1 2" />
        <circle cx="80" cy="135" r="1.5" fill="#94a3b8" />
        <circle cx="80" cy="146" r="1.5" fill="#94a3b8" />

        {/* Neck */}
        <rect x="70" y="90" width="20" height="26" rx="6" fill="url(#kgg_skin)" />

        {/* Face */}
        <ellipse cx="80" cy="74" rx="31" ry="35" fill="url(#kgg_skin)" />

        {/* Ears */}
        <ellipse cx="48" cy="74" rx="4.5" ry="8" fill="#e0a37c" />
        <ellipse cx="112" cy="74" rx="4.5" ry="8" fill="#e0a37c" />

        {/* Kuwaiti Gahfiya */}
        <path d="M48 56 C47 30, 62 18, 80 18 C98 18, 113 30, 112 56 C102 52, 90 50, 80 50 C70 50, 58 52, 48 56 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />
        <ellipse cx="80" cy="48" rx="28" ry="4" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
        <ellipse cx="80" cy="40" rx="24" ry="3.5" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
        <ellipse cx="80" cy="32" rx="18" ry="3" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />

        {/* Eyebrows */}
        <path d="M59 60 Q67 57 74 60" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M86 60 Q93 57 101 60" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Modern Elegant Glasses */}
        <rect x="54" y="61" width="22" height="17" rx="5" fill="rgba(255,255,255,0.25)" stroke="#09090b" strokeWidth="2.2" />
        <rect x="84" y="61" width="22" height="17" rx="5" fill="rgba(255,255,255,0.25)" stroke="#09090b" strokeWidth="2.2" />
        <line x1="76" y1="68" x2="84" y2="68" stroke="#09090b" strokeWidth="2.5" />
        <line x1="48" y1="67" x2="54" y2="67" stroke="#09090b" strokeWidth="2" />
        <line x1="106" y1="67" x2="112" y2="67" stroke="#09090b" strokeWidth="2" />

        {/* Eyes inside lenses */}
        <circle cx="65" cy="69" r="2.5" fill="#3b2518" />
        <circle cx="65.5" cy="68.5" r="0.8" fill="#ffffff" />
        <circle cx="95" cy="69" r="2.5" fill="#3b2518" />
        <circle cx="95.5" cy="68.5" r="0.8" fill="#ffffff" />

        {/* Nose */}
        <path d="M78 69 L77 78 Q77 82 80 82 Q83 82 83 78 L82 69" stroke="#c0825c" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Mustache & Neat Beard */}
        <path d="M65 84 Q80 87 95 84 Q80 92 65 84 Z" fill="#1c1917" />
        <path d="M51 76 C51 98, 62 109, 80 109 C98 109, 109 98, 109 76 C105 80, 101 88, 95 96 C88 102, 72 102, 65 96 C59 88, 55 80, 51 76 Z" fill="#1c1917" />
      </svg>
    ),
  },
  {
    id: 'kuwaiti_winter_ghutra',
    title: 'دشداشة شتوية وغترة',
    attire: 'دشداشة كويتية شتوية كحلية مع غترة بيضاء وعقال',
    render: () => (
      <svg viewBox="0 0 160 160" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="kwg_bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="kwg_skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5cdb1" />
            <stop offset="100%" stopColor="#d89f78" />
          </linearGradient>
          <linearGradient id="kwg_winter" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        <circle cx="80" cy="80" r="80" fill="url(#kwg_bg)" />

        {/* White Ghutra Backing */}
        <path d="M26 68 C20 95, 24 135, 38 160 L122 160 C136 135, 140 95, 134 68 Z" fill="#e2e8f0" />
        <path d="M30 68 C24 95, 28 135, 42 160 L118 160 C132 135, 136 95, 130 68 Z" fill="#ffffff" />

        {/* Kuwaiti Winter Dark Navy/Charcoal Dishdasha */}
        <path d="M20 160 C24 128, 48 116, 80 116 C112 116, 136 128, 140 160 Z" fill="url(#kwg_winter)" />
        {/* Winter Dishdasha Stiff Collar & Gold/Silver Buttons */}
        <path d="M68 112 C72 110, 88 110, 92 112 L90 128 C86 130, 74 130, 70 128 Z" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <line x1="80" y1="126" x2="80" y2="160" stroke="#475569" strokeWidth="1.2" strokeDasharray="1 2" />
        <circle cx="80" cy="134" r="1.5" fill="#f59e0b" />
        <circle cx="80" cy="144" r="1.5" fill="#f59e0b" />
        <circle cx="80" cy="154" r="1.5" fill="#f59e0b" />

        {/* Ghutra front drapery */}
        <path d="M38 48 C28 68, 30 115, 48 140 C42 120, 44 80, 48 54 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />
        <path d="M122 48 C132 68, 130 115, 112 140 C118 120, 116 80, 112 54 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />

        {/* Neck */}
        <rect x="70" y="94" width="20" height="24" rx="6" fill="url(#kwg_skin)" />

        {/* Face */}
        <ellipse cx="80" cy="74" rx="30" ry="34" fill="url(#kwg_skin)" />

        {/* Ears */}
        <ellipse cx="49" cy="74" rx="4.5" ry="8" fill="#e0a37c" />
        <ellipse cx="111" cy="74" rx="4.5" ry="8" fill="#e0a37c" />

        {/* Eyes & Eyebrows */}
        <path d="M60 62 Q68 58 74 62" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M86 62 Q92 58 100 62" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <ellipse cx="67" cy="68" rx="5" ry="3.5" fill="#ffffff" />
        <ellipse cx="93" cy="68" rx="5" ry="3.5" fill="#ffffff" />
        <circle cx="67.5" cy="68" r="2.8" fill="#3b2518" />
        <circle cx="68" cy="67.5" r="1" fill="#ffffff" />
        <circle cx="93.5" cy="68" r="2.8" fill="#3b2518" />
        <circle cx="94" cy="67.5" r="1" fill="#ffffff" />

        {/* Nose */}
        <path d="M78 65 L77 78 Q77 82 80 82 Q83 82 83 78 L82 65" stroke="#c28867" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Kuwaiti Mustache & Distinguished Salt-and-Pepper Beard */}
        <path d="M66 84 Q80 87 94 84 Q80 92 66 84 Z" fill="#292524" />
        <path d="M52 74 C52 98, 62 108, 80 108 C98 108, 108 98, 108 74 C104 78, 100 86, 95 96 C88 102, 72 102, 65 96 C60 86, 56 78, 52 74 Z" fill="#292524" />
        {/* Subtle grey beard highlights */}
        <path d="M72 104 Q80 106 88 104" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" fill="none" />

        {/* Ghutra Peak */}
        <path d="M42 54 C46 36, 60 28, 80 28 C100 28, 114 36, 118 54 C108 42, 94 40, 80 41 C66 40, 52 42, 42 54 Z" fill="#ffffff" />

        {/* Black Agal */}
        <ellipse cx="80" cy="38" rx="38" ry="9" fill="none" stroke="#09090b" strokeWidth="6" />
        <ellipse cx="80" cy="42" rx="36" ry="8.5" fill="none" stroke="#18181b" strokeWidth="5.5" />
        <ellipse cx="80" cy="37.5" rx="35" ry="7.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    ),
  },
];

interface AvatarViewProps {
  avatarId?: string;
  customPhoto?: string | null;
  className?: string;
}

export const AvatarView: React.FC<AvatarViewProps> = ({
  avatarId = 'kuwaiti_ghutra_white',
  customPhoto = null,
  className = 'w-full h-full',
}) => {
  if (customPhoto) {
    return <img src={customPhoto} alt="Player avatar" className={`${className} object-cover rounded-full`} />;
  }

  const found = AVATARS_CATALOG.find((a) => a.id === avatarId) || AVATARS_CATALOG[0];
  return <div className={className}>{found.render()}</div>;
};
