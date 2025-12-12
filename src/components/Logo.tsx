import ermgoldLogo from '@/assets/ermgold-logo-clean.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-12 w-auto',
  md: 'h-20 w-auto',
  lg: 'h-28 w-auto',
  xl: 'h-40 w-auto',
};

const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  return (
    <img 
      src={ermgoldLogo} 
      alt="ERMGOLD Logo" 
      className={`object-contain ${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
