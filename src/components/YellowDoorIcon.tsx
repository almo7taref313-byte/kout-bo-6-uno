import React from 'react';

interface YellowDoorIconProps {
  className?: string;
}

export const YellowDoorIcon: React.FC<YellowDoorIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={`inline-block ${className} text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)] flex-shrink-0`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Door Frame (Yellow) */}
    <path d="M4 21V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17" stroke="#facc15" />
    {/* Swung Open Door leaf in Perspective (Vibrant Yellow fill + outline) */}
    <path d="M15 4l5 2.5v12.5l-5 2V4z" fill="#facc15" fillOpacity="0.85" stroke="#eab308" />
    {/* Door Handle / Knob */}
    <circle cx="17.5" cy="12.5" r="1" fill="#78350f" stroke="none" />
    {/* Exit Directional Arrow heading outside through the open door */}
    <path d="M2 12h7m-4-3.5L2 12l3 3.5" stroke="#fde047" strokeWidth="2.4" />
  </svg>
);
