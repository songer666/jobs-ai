interface LogoProps {
  size?: number;
  className?: string;
}

const Logo = ({ size = 32, className = '' }: LogoProps) => {
  return (
    <svg 
      viewBox="0 0 34 28" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * 28 / 34}
      className={className}
    >
      <path 
        d="M8 4C8 4 4 8 4 14C4 20 8 24 14 24H20C26 24 30 20 30 14C30 8 26 4 20 4" 
        stroke="#ffda52" 
        strokeWidth="3" 
        strokeLinecap="round"
      />
      <circle cx="12" cy="14" r="2" fill="#ffda52"/>
      <circle cx="22" cy="14" r="2" fill="#ffda52"/>
      <path 
        d="M14 18C14 18 17 21 20 18" 
        stroke="#ffda52" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Logo;
