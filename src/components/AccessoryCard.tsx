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
        className={`relative w-full h-28 rounded-xl overflow-hidden cursor-pointer ${
          quantity > 0 ? 'ring-2 ring-gold' : ''
        }`}
        onClick={() => setShowPopup(true)}
      >
        {/* Background Image */}
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
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-l from-background/90 via-background/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-3">
          {/* Top - Name */}
          <div className="text-right">
            <h4 className="font-heading text-sm md:text-base text-foreground leading-tight">
              {accessory.name_ar}
            </h4>
          </div>

          {/* Middle - Price */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-lg border border-border/50">
              <span className="font-heading text-lg text-gold">
                {accessory.price}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
          </div>

          {/* Bottom - Quantity Controls */}
          <div className="flex items-center justify-start gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityChange(1);
              }}
              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-gold hover:text-secondary hover:border-gold transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-heading text-lg text-foreground">{quantity}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityChange(-1);
              }}
              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-gold hover:text-secondary hover:border-gold transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected Badge */}
        {quantity > 0 && (
          <div className="absolute top-2 left-2 bg-gold text-secondary text-xs font-bold px-2 py-0.5 rounded-full">
            ✓ {quantity}
          </div>
        )}
      </div>

      {/* Floating Popup for Description */}
      <AnimatePresence>
        {showPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
              onClick={() => setShowPopup(false)}
            />
            
            {/* Popup Container - Scrollable */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] overflow-y-auto"
              onClick={() => setShowPopup(false)}
            >
              <div className="min-h-full flex items-center justify-center p-4 py-8">
                {/* Popup Content */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setShowPopup(false)}
                    className="absolute top-4 left-4 z-20 p-2 rounded-full bg-background/90 hover:bg-muted transition-colors shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Accessory Image */}
                  <div className="relative aspect-[16/9] bg-muted">
                    {accessory.image_url ? (
                      <img
                        src={accessory.image_url}
                        alt={accessory.name_ar}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-6xl opacity-30">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Accessory Details */}
                  <div className="p-5 space-y-4">
                    {/* Title and Price */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-heading text-xl text-foreground leading-tight">{accessory.name_ar}</h3>
                      </div>
                      <div className="text-left flex-shrink-0 bg-gold/10 px-3 py-1.5 rounded-lg">
                        <span className="font-heading text-xl text-gold">+{accessory.price}</span>
                        <span className="text-gold text-sm mr-1">{currency}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {accessory.description_ar && (
                      <div className="bg-muted/50 rounded-xl p-4">
                        <p className="text-foreground/80 leading-relaxed text-sm">
                          {accessory.description_ar}
                        </p>
                      </div>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3">
                      <span className="text-foreground font-medium text-sm">الكمية:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onQuantityChange(-1)}
                          className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-gold/10 hover:border-gold hover:text-gold transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-heading text-xl">{quantity}</span>
                        <button
                          onClick={() => onQuantityChange(1)}
                          className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-gold/10 hover:border-gold hover:text-gold transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => {
                        if (quantity === 0) onQuantityChange(1);
                        setShowPopup(false);
                      }}
                      className="w-full btn-gold py-5 font-heading text-base"
                    >
                      {quantity > 0 ? 'تم الإضافة ✓' : 'إضافة للمنتج'}
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccessoryCard;
