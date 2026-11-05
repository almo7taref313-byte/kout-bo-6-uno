import React from 'react';

export interface AvatarItem {
  id: string;
  title: string;
  attire: string;
  src: string;
  render: () => React.ReactNode;
}

const renderSvgImg = (src: string, alt: string) => (
  <img
    src={src}
    alt={alt}
    draggable={false}
    className="w-full h-full object-cover scale-[1.12] select-none pointer-events-none"
  />
);

export const AVATAR_BOT_NAMES: Record<string, string> = {
  kuwaiti_ghutra_white: 'بواحمد',
  kuwaiti_shemagh_red: 'السلم',
  kuwaiti_gahfiya: 'جابر',
  kuwaiti_dishdasha_plain: 'عبود',
  kuwaiti_gahfiya_glasses: 'بدر',
  kuwaiti_winter_ghutra: 'بوسكندر',
};

export const getBotNameForAvatar = (avatarId?: string): string => {
  if (avatarId && AVATAR_BOT_NAMES[avatarId]) {
    return AVATAR_BOT_NAMES[avatarId];
  }
  return 'بواحمد';
};

export const AVATARS_CATALOG: AvatarItem[] = [
  {
    id: 'kuwaiti_ghutra_white',
    title: 'بواحمد',
    attire: 'غترة بيضاء ولحية سوداء',
    src: '/avatars/avatar_1.svg',
    render: () => renderSvgImg('/avatars/avatar_1.svg', 'بواحمد'),
  },
  {
    id: 'kuwaiti_shemagh_red',
    title: 'السلم',
    attire: 'شاب مبتسم بقبعة كاب حمراء',
    src: '/avatars/avatar_2.svg',
    render: () => renderSvgImg('/avatars/avatar_2.svg', 'السلم'),
  },
  {
    id: 'kuwaiti_gahfiya',
    title: 'جابر',
    attire: 'قحفية بيضاء مطرزة ولحية بيضاء',
    src: '/avatars/avatar_3.svg',
    render: () => renderSvgImg('/avatars/avatar_3.svg', 'جابر'),
  },
  {
    id: 'kuwaiti_dishdasha_plain',
    title: 'عبود',
    attire: 'شاب مبتسم بشعر أسود مرتب',
    src: '/avatars/avatar_4.svg',
    render: () => renderSvgImg('/avatars/avatar_4.svg', 'عبود'),
  },
  {
    id: 'kuwaiti_gahfiya_glasses',
    title: 'بدر',
    attire: 'شاب بنظارة شمسية سوداء',
    src: '/avatars/avatar_5.svg',
    render: () => renderSvgImg('/avatars/avatar_5.svg', 'بدر'),
  },
  {
    id: 'kuwaiti_winter_ghutra',
    title: 'بوسكندر',
    attire: 'رجل بشارب كثيف وطاقية سوداء',
    src: '/avatars/avatar_6.svg',
    render: () => renderSvgImg('/avatars/avatar_6.svg', 'بوسكندر'),
  },
  {
    id: 'kuwaiti_avatar_7',
    title: '',
    attire: 'رجل مبتسم بقحفية بيضاء ودشداشة',
    src: '/avatars/avatar_7.svg',
    render: () => renderSvgImg('/avatars/avatar_7.svg', ''),
  },
  {
    id: 'kuwaiti_avatar_8',
    title: '',
    attire: 'رجل بغترة بيضاء وعقال أسود',
    src: '/avatars/avatar_8.svg',
    render: () => renderSvgImg('/avatars/avatar_8.svg', ''),
  },
  {
    id: 'kuwaiti_avatar_9',
    title: '',
    attire: 'رجل بشماغ أحمر ودشداشة داكنة',
    src: '/avatars/avatar_9.svg',
    render: () => renderSvgImg('/avatars/avatar_9.svg', ''),
  },
  {
    id: 'kuwaiti_avatar_10',
    title: '',
    attire: 'رجل مبتسم بنظارة زرقاء ودشداشة بيضاء',
    src: '/avatars/avatar_10.svg',
    render: () => renderSvgImg('/avatars/avatar_10.svg', ''),
  },
  {
    id: 'kuwaiti_avatar_11',
    title: '',
    attire: 'شاب مبتسم بقبعة كاب بيج ودشداشة',
    src: '/avatars/avatar_11.svg',
    render: () => renderSvgImg('/avatars/avatar_11.svg', ''),
  },
  {
    id: 'kuwaiti_avatar_12',
    title: '',
    attire: 'شاب مبتسم بهودي كحلي',
    src: '/avatars/avatar_12.svg',
    render: () => renderSvgImg('/avatars/avatar_12.svg', ''),
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
    return (
      <img
        src={customPhoto}
        alt="Player avatar"
        draggable={false}
        className={`${className} object-cover rounded-full select-none`}
      />
    );
  }

  const found = AVATARS_CATALOG.find((a) => a.id === avatarId) || AVATARS_CATALOG[0];
  return (
    <div className={`${className} overflow-hidden rounded-full flex items-center justify-center`}>
      {found.render()}
    </div>
  );
};
