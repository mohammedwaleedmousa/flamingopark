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
      {/* Accessory Card - Horizontal Rectangular Design */}
      <div
        className={`relative flex items-center gap-3 rounded-lg overflow-hidden border cursor-pointer p-2 ${
          quantity > 0
            ? 'border-gold bg-gold/5'
            : 'border-border bg-card hover:border-gold/50'
        }`}
        onClick={() => setShowPopup(true)}
      >
        {/* Image */}
        <div className="relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted">
          {accessory.image_url ? (
            <img
              src={accessory.image_url}
              alt={accessory.name_ar}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xl opacity-30">📦</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-body text-sm text-foreground truncate">{accessory.name_ar}</h4>
          <span className="text-gold font-heading text-sm">
            +{accessory.price} <span className="text-[10px]">{currency}</span>
          </span>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuantityChange(-1);
            }}
            className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-gold/10 hover:text-gold"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-6 text-center text-sm font-medium">{quantity}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuantityChange(1);
            }}
            className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-gold/10 hover:text-gold"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Selected Badge */}
        {quantity > 0 && (
          <div className="absolute top-1 right-1 bg-gold text-secondary text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
            ✓
          </div>
        )}
      </div>

      {/* Floating Popup */}
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
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

                  {/* Selected Badge on popup */}
                  {quantity > 0 && (
                    <div className="absolute top-4 right-4 z-20 bg-gold text-secondary text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                      الكمية: {quantity}
                    </div>
                  )}

                  {/* Accessory Image */}
                  <div className="relative aspect-[4/3] bg-muted">
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
                  <div className="p-6 space-y-5">
                    {/* Title and Price */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-heading text-2xl text-foreground leading-tight">{accessory.name_ar}</h3>
                        {accessory.name && (
                          <p className="text-muted-foreground text-sm mt-1">{accessory.name}</p>
                        )}
                      </div>
                      <div className="text-left flex-shrink-0 bg-gold/10 px-4 py-2 rounded-xl">
                        <span className="font-heading text-2xl text-gold">+{accessory.price}</span>
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

                    {/* Gold divider */}
                    <div className="h-px bg-gradient-to-r from-border via-gold/40 to-border" />

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-medium">اختر الكمية:</span>
                      <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
                        <button
                          onClick={() => onQuantityChange(-1)}
                          className="w-11 h-11 rounded-lg bg-background flex items-center justify-center hover:bg-gold/10 hover:text-gold transition-colors"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="w-12 text-center font-heading text-2xl">{quantity}</span>
                        <button
                          onClick={() => onQuantityChange(1)}
                          className="w-11 h-11 rounded-lg bg-background flex items-center justify-center hover:bg-gold/10 hover:text-gold transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => {
                          if (quantity === 0) onQuantityChange(1);
                          setShowPopup(false);
                        }}
                        className="flex-1 btn-gold py-6 font-heading text-lg"
                      >
                        {quantity > 0 ? 'تم ✓' : 'إضافة للمنتج'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowPopup(false)}
                        className="py-6 px-6 border-2"
                      >
                        إغلاق
                      </Button>
                    </div>
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