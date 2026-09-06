import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
    >
      {/* Cream Circle Background */}
      <circle 
        cx="50" 
        cy="50" 
        r="46" 
        className="fill-[#F3EDE2] dark:fill-[#2C2825] stroke-[#3E342B]/15 dark:stroke-[#FAF7F2]/10" 
        strokeWidth="1"
      />
      
      {/* Primary Curved 4-Point Star (Offset slightly bottom-left) */}
      <path
        d="M 42 24 Q 42 54 72 54 Q 42 54 42 84 Q 42 54 12 54 Q 42 54 42 24 Z"
        className="fill-[#3E342B] dark:fill-[#FAF7F2]"
      />
      
      {/* Background-colored Cutout Circle to create the middle hole */}
      <circle cx="42" cy="54" r="7" className="fill-[#F3EDE2] dark:fill-[#2C2825]" />
      
      {/* Central dot inside the cutout */}
      <circle cx="42" cy="54" r="2.5" className="fill-[#3E342B] dark:fill-[#FAF7F2]" />
      
      {/* Secondary small star in the top-right */}
      <path
        d="M 72 18 Q 72 26 80 26 Q 72 26 72 34 Q 72 26 64 26 Q 72 26 72 18 Z"
        className="fill-[#3E342B] dark:fill-[#FAF7F2]"
        transform="rotate(-15 72 26)"
      />
    </svg>
  );
};
