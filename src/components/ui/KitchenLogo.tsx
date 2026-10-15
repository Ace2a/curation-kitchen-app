import React from "react";

interface KitchenLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
  plateColor?: string;
  rimColor?: string;
  letterColor?: string;
  text?: string;
}

/**
 * KitchenLogo - Reusable Dinner Plate Logo with 'CK' centered on the plate.
 */
export const KitchenLogo: React.FC<KitchenLogoProps> = ({
  className = "w-6 h-6",
  size,
  plateColor = "currentColor",
  rimColor,
  letterColor = "currentColor",
  text = "CK",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      {/* Outer Plate Rim */}
      <circle
        cx="12"
        cy="12"
        r="10.2"
        stroke={plateColor}
        strokeWidth="1.6"
      />
      {/* Plate Inner Rim Border */}
      <circle
        cx="12"
        cy="12"
        r="7.8"
        stroke={rimColor || plateColor}
        strokeWidth="1"
        strokeOpacity="0.65"
      />
      {/* Plate Center Basin Line */}
      <circle
        cx="12"
        cy="12"
        r="6.2"
        stroke={rimColor || plateColor}
        strokeWidth="0.5"
        strokeDasharray="1.2 1"
        strokeOpacity="0.45"
      />
      {/* Letter 'CK' in the center of the dinner plate */}
      <text
        x="12"
        y="12.2"
        fill={letterColor}
        fontSize={text.length > 1 ? "7" : "9.5"}
        fontWeight="900"
        fontFamily="Georgia, serif, ui-serif"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing={text.length > 1 ? "-0.4" : "normal"}
      >
        {text}
      </text>
    </svg>
  );
};

export default KitchenLogo;
