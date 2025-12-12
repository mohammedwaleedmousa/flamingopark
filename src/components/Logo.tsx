import ermgoldLogo from '@/assets/ermgold-logo.jpeg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-auto',
  md: 'h-12 w-auto',
  lg: 'h-16 w-auto',
  xl: 'h-24 w-auto',
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
