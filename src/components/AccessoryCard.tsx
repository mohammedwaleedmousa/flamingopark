import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Accessory {
  name: string;
  name_ar: string;
  price: number;
  image_url?: string;
  description?: string;
  description_ar?: string;
}

interface AccessoryCardProps {
  accessory: Accessory;
  quantity: number;
  currency: string;
  onQuantityChange: (delta: number) => void;
}

const AccessoryCard = ({ accessory, quantity, currency, onQuantityChange }: AccessoryCardProps) => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      {/* Accessory Card - Full Width Image Background Design */}
      <div
        className={`relative w-full h-28 rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-300 ${
          quantity > 0 ? 'border-gold shadow-lg shadow-gold/20' : 'border-border hover:border-gold/50'
        }`}
        onClick={() => setShowPopup(true)}
      >
        {/* Background Image - No effects */}
        <div className="absolute inset-0 bg-muted">
          {accessory.image_url ? (
            <img
              src={accessory.image_url}
              alt={accessory.name_ar}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              style={{ opacity: 1 }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-4xl opacity-30">📦</span>
            </div>
          )}
        </div>

        {/* Content - Positioned at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <div className="flex items-center justify-between">
            {/* Quantity Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuantityChange(1);
                }}
                className="w-7 h-7 rounded-full bg-background/90 border border-border/50 flex items-center justify-center hover:bg-gold hover:text-secondary hover:border-gold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="w-5 text-center font-heading text-sm text-foreground bg-background/90 rounded px-1">{quantity}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuantityChange(-1);
                }}
                className="w-7 h-7 rounded-full bg-background/90 border border-border/50 flex items-center justify-center hover:bg-gold hover:text-secondary hover:border-gold transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Price & Name */}
            <div className="text-right">
              <h4 className="font-heading text-xs text-foreground bg-background/90 px-1.5 py-0.5 rounded inline-block mb-0.5">
                {accessory.name_ar}
              </h4>
              <div className="flex items-center justify-end gap-1">
                <span className="font-heading text-sm text-gold bg-background/90 px-1.5 py-0.5 rounded">
                  {accessory.price} {currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Badge */}
        {quantity > 0 && (
          <div className="absolute top-2 left-2 bg-gold text-secondary text-xs font-bold px-2 py-0.5 rounded-full">
            ✓
          </div>
        )}
      </div>

      {/* Beautiful Modal Popup */}
      <AnimatePresence>
        {showPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[60]"
              onClick={() => setShowPopup(false)}
            />
            
            {/* Modal Container - centered wrapper */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={() => setShowPopup(false)}
            >
              <div
                dir="rtl"
                className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-card border border-border shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >


              {/* Close Button */}
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-4 left-4 z-20 p-2 rounded-full bg-background/80 hover:bg-background transition-colors border border-border"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>

              {/* Image Section */}
              <div className="relative h-64 md:h-72 bg-muted overflow-hidden">
                {accessory.image_url ? (
                  <img
                    src={accessory.image_url}
                    alt={accessory.name_ar}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-8xl opacity-30">📦</span>
                  </div>
                )}
                
                
                {/* Selected Indicator */}
                {quantity > 0 && (
                  <div className="absolute top-4 right-4 bg-gold text-secondary px-3 py-1 rounded-full text-sm font-heading flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4" />
                    تم الإضافة
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="p-4 space-y-2 overflow-y-auto">
                {/* Title and Price Row */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-heading text-lg text-foreground flex-1">{accessory.name_ar}</h3>
                  <div className="text-right whitespace-nowrap">
                    <span className="font-heading text-lg text-gold">+{accessory.price}</span>
                    <span className="text-sm text-gold mr-1">{currency}</span>
                  </div>
                </div>

                {/* Description */}
                {accessory.description_ar && (
                  <>
                    <div className="w-16 h-0.5 bg-gradient-to-r from-gold to-gold/30" />
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {accessory.description_ar}
                    </p>
                  </>
                )}
              </div>


              {/* Footer Actions */}
              <div className="p-4 border-t border-border/50 bg-card">
                <div className="flex items-center justify-between">

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
                    <button
                      onClick={() => onQuantityChange(-1)}
                      className="w-10 h-10 rounded-lg bg-background flex items-center justify-center hover:bg-gold/10 hover:text-gold transition-all border border-border/50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-heading text-lg">{quantity}</span>
                    <button
                      onClick={() => onQuantityChange(1)}
                      className="w-10 h-10 rounded-lg bg-background flex items-center justify-center hover:bg-gold/10 hover:text-gold transition-all border border-border/50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Add/Done Button */}
                  <Button
                    onClick={() => {
                      if (quantity === 0) onQuantityChange(1);
                      setShowPopup(false);
                    }}
                    className="btn-gold px-8 py-3 h-auto text-base"
                  >
                    {quantity > 0 ? (
                      <span className="flex items-center gap-2">
                        <span>تم</span>
                        <span className="text-secondary/80">({quantity})</span>
                      </span>
                    ) : (
                      'إضافة للطلب'
                    )}
                  </Button>
                </div>
                </div>
              </div>
            </motion.div>

          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccessoryCard;
