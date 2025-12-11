import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore, Country } from '@/store/useStore';
import { MapPin } from 'lucide-react';

const countries = [
  {
    code: 'SA' as Country,
    name: 'Saudi Arabia',
    nameAr: 'المملكة العربية السعودية',
    flag: '🇸🇦',
  },
  {
    code: 'YE' as Country,
    name: 'Yemen',
    nameAr: 'اليمن',
    flag: '🇾🇪',
  },
];

const SelectCountry = () => {
  const navigate = useNavigate();
  const { setCountry } = useStore();

  const handleSelect = (countryCode: Country) => {
    setCountry(countryCode);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--gold)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center max-w-2xl"
      >
        <motion.h1
          className="font-heading text-4xl md:text-5xl text-gold mb-4 tracking-wider"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          ERMGOLD
        </motion.h1>

        <motion.div
          className="flex items-center justify-center gap-2 mb-8 text-gold/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <MapPin className="w-4 h-4" />
          <span className="font-body text-sm tracking-wider">اختر موقعك</span>
        </motion.div>

        <motion.div
          className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-gold to-transparent mb-12"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {countries.map((country, index) => (
            <motion.button
              key={country.code}
              onClick={() => handleSelect(country.code)}
              className="group relative p-8 border border-gold/30 bg-secondary/50 backdrop-blur-sm transition-all duration-500 hover:border-gold hover:bg-gold/5"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-5xl mb-4">{country.flag}</div>
              <h2 className="font-heading text-xl text-gold mb-1 tracking-wide">
                {country.nameAr}
              </h2>
              <p className="text-gold/50 text-sm font-body">{country.name}</p>
              
              {/* Hover effect corners */}
              <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SelectCountry;
