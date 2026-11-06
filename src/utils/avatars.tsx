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
  kuwaiti_shemagh_red: 'بدر',
  kuwaiti_gahfiya: 'جابر',
  kuwaiti_dishdasha_plain: 'السلم',
  kuwaiti_gahfiya_glasses: 'بوسكندر',
  kuwaiti_winter_ghutra: 'عبود',
  kuwaiti_avatar_7: 'بواحمد',
  kuwaiti_avatar_8: 'بدر',
  kuwaiti_avatar_9: 'جابر',
  kuwaiti_avatar_10: 'السلم',
  kuwaiti_avatar_11: 'بوسكندر',
  kuwaiti_avatar_12: 'عبود',
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
    attire: 'رجل مبتسم بقحفية بيضاء ودشداشة',
    src: '/avatars/avatar_7.svg',
    render: () => renderSvgImg('/avatars/avatar_7.svg', 'بواحمد'),
  },
  {
    id: 'kuwaiti_shemagh_red',
    title: 'بدر',
    attire: 'رجل بغترة بيضاء وعقال أسود',
    src: '/avatars/avatar_8.svg',
    render: () => renderSvgImg('/avatars/avatar_8.svg', 'بدر'),
  },
  {
    id: 'kuwaiti_gahfiya',
    title: 'جابر',
    attire: 'رجل بشماغ أحمر ودشداشة داكنة',
    src: '/avatars/avatar_9.svg',
    render: () => renderSvgImg('/avatars/avatar_9.svg', 'جابر'),
  },
  {
    id: 'kuwaiti_dishdasha_plain',
    title: 'السلم',
    attire: 'رجل مبتسم بنظارة زرقاء ودشداشة بيضاء',
    src: '/avatars/avatar_10.svg',
    render: () => renderSvgImg('/avatars/avatar_10.svg', 'السلم'),
  },
  {
    id: 'kuwaiti_gahfiya_glasses',
    title: 'بوسكندر',
    attire: 'شاب مبتسم بقبعة كاب بيج ودشداشة',
    src: '/avatars/avatar_11.svg',
    render: () => renderSvgImg('/avatars/avatar_11.svg', 'بوسكندر'),
  },
  {
    id: 'kuwaiti_winter_ghutra',
    title: 'عبود',
    attire: 'شاب مبتسم بهودي كحلي',
    src: '/avatars/avatar_12.svg',
    render: () => renderSvgImg('/avatars/avatar_12.svg', 'عبود'),
  },
];

const LEGACY_AVATAR_REDIRECT: Record<string, string> = {
  kuwaiti_avatar_7: 'kuwaiti_ghutra_white',
  kuwaiti_avatar_8: 'kuwaiti_shemagh_red',
  kuwaiti_avatar_9: 'kuwaiti_gahfiya',
  kuwaiti_avatar_10: 'kuwaiti_dishdasha_plain',
  kuwaiti_avatar_11: 'kuwaiti_gahfiya_glasses',
  kuwaiti_avatar_12: 'kuwaiti_winter_ghutra',
};

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

  const normalizedId = (avatarId && LEGACY_AVATAR_REDIRECT[avatarId]) || avatarId;
  const found = AVATARS_CATALOG.find((a) => a.id === normalizedId) || AVATARS_CATALOG[0];
  return (
    <div className={`${className} overflow-hidden rounded-full flex items-center justify-center`}>
      {found.render()}
    </div>
  );
};
