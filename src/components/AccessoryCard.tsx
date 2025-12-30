import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
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
        className={`relative w-full h-28 rounded-xl overflow-hidden cursor-pointer border ${
          quantity > 0 ? 'border-gold' : 'border-border'
        }`}
        onClick={() => setShowPopup(true)}
      >
        {/* Background Image - No effects */}
        <div className="absolute inset-0">
          {accessory.image_url ? (
            <img
              src={accessory.image_url}
              alt={accessory.name_ar}
              className="w-full h-full object-cover"
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

      {/* Floating Popup - Full Image View */}
      <AnimatePresence>
        {showPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 z-[60]"
              onClick={() => setShowPopup(false)}
            />
            
            {/* Popup Container */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex flex-col"
              onClick={() => setShowPopup(false)}
            >
              {/* Close Button */}
              <div className="absolute top-4 left-4 z-20">
                <button
                  onClick={() => setShowPopup(false)}
                  className="p-3 rounded-full bg-background/20 hover:bg-background/40 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Full Image */}
              <div className="flex-1 flex items-center justify-center p-4">
                {accessory.image_url ? (
                  <motion.img
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    src={accessory.image_url}
                    alt={accessory.name_ar}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-6xl opacity-30">📦</span>
                  </div>
                )}
              </div>

              {/* Bottom Info Panel */}
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="bg-card border-t border-border p-4 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Title and Price */}
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg text-foreground">{accessory.name_ar}</h3>
                  <span className="font-heading text-lg text-gold">+{accessory.price} {currency}</span>
                </div>

                {/* Description */}
                {accessory.description_ar && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {accessory.description_ar}
                  </p>
                )}

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onQuantityChange(-1)}
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-gold/10 hover:text-gold transition-all"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-heading text-xl">{quantity}</span>
                    <button
                      onClick={() => onQuantityChange(1)}
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-gold/10 hover:text-gold transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    onClick={() => {
                      if (quantity === 0) onQuantityChange(1);
                      setShowPopup(false);
                    }}
                    className="btn-gold px-6"
                  >
                    {quantity > 0 ? 'تم ✓' : 'إضافة'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccessoryCard;
