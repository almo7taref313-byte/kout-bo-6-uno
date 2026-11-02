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

export const AVATARS_CATALOG: AvatarItem[] = [
  {
    id: 'kuwaiti_ghutra_white',
    title: 'غترة ولحية سوداء',
    attire: 'غترة بيضاء ولحية سوداء',
    src: '/avatars/avatar_1.svg',
    render: () => renderSvgImg('/avatars/avatar_1.svg', 'غترة ولحية سوداء'),
  },
  {
    id: 'kuwaiti_shemagh_red',
    title: 'كاب أحمر',
    attire: 'شاب مبتسم بقبعة كاب حمراء',
    src: '/avatars/avatar_2.svg',
    render: () => renderSvgImg('/avatars/avatar_2.svg', 'كاب أحمر'),
  },
  {
    id: 'kuwaiti_gahfiya',
    title: 'قحفية كويتية',
    attire: 'قحفية بيضاء مطرزة ولحية بيضاء',
    src: '/avatars/avatar_3.svg',
    render: () => renderSvgImg('/avatars/avatar_3.svg', 'قحفية كويتية'),
  },
  {
    id: 'kuwaiti_dishdasha_plain',
    title: 'شاب مبتسم',
    attire: 'شاب مبتسم بشعر أسود مرتب',
    src: '/avatars/avatar_4.svg',
    render: () => renderSvgImg('/avatars/avatar_4.svg', 'شاب مبتسم'),
  },
  {
    id: 'kuwaiti_gahfiya_glasses',
    title: 'نظارة شمسية',
    attire: 'شاب بنظارة شمسية سوداء',
    src: '/avatars/avatar_5.svg',
    render: () => renderSvgImg('/avatars/avatar_5.svg', 'نظارة شمسية'),
  },
  {
    id: 'kuwaiti_winter_ghutra',
    title: 'طاقية وشارب',
    attire: 'رجل بشارب كثيف وطاقية سوداء',
    src: '/avatars/avatar_6.svg',
    render: () => renderSvgImg('/avatars/avatar_6.svg', 'طاقية وشارب'),
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
