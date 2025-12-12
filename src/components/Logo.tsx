import ermgoldLogo from '@/assets/ermgold-logo.jpeg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-10 w-auto',
  md: 'h-14 w-auto',
  lg: 'h-20 w-auto',
  xl: 'h-28 w-auto',
};

const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  return (
    <img 
      src={ermgoldLogo} 
      alt="ERMGOLD Logo" 
      className={`object-contain rounded ${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
