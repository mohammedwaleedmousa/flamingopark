import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, ZoomIn } from 'lucide-react';
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
      {/* Accessory Card - New Design */}
      <div
        className={`relative rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
          quantity > 0
            ? 'border-gold shadow-[0_0_15px_hsl(var(--gold)/0.2)]'
            : 'border-border/50 hover:border-gold/50'
        }`}
        onClick={() => setShowPopup(true)}
      >
        {/* Image Background */}
        <div className="relative aspect-[16/9] bg-gradient-to-br from-muted to-muted/50">
          {accessory.image_url ? (
            <img
              src={accessory.image_url}
              alt={accessory.name_ar}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-30">📦</span>
            </div>
          )}
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
          
          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h4 className="font-heading text-lg text-foreground mb-1">{accessory.name_ar}</h4>
            <div className="flex items-center justify-between">
              <span className="text-gold font-heading text-xl">
                {accessory.price} <span className="text-sm">{currency}</span>
              </span>
              <button 
                className="p-1.5 rounded-full bg-background/50 backdrop-blur-sm text-muted-foreground hover:text-gold transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopup(true);
                }}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selected Badge */}
          {quantity > 0 && (
            <div className="absolute top-3 right-3 bg-gold text-secondary text-sm font-bold px-3 py-1 rounded-full shadow-lg">
              {quantity}
            </div>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-center gap-4 p-3 bg-muted/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuantityChange(-1);
            }}
            className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center hover:border-gold hover:text-gold transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-heading text-xl">{quantity}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuantityChange(1);
            }}
            className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center hover:border-gold hover:text-gold transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
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
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setShowPopup(false)}
            />
            
            {/* Popup Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-4 left-4 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Accessory Image */}
              <div className="relative aspect-square bg-gradient-to-br from-muted to-muted/50">
                {accessory.image_url ? (
                  <img
                    src={accessory.image_url}
                    alt={accessory.name_ar}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl opacity-30">📦</span>
                  </div>
                )}
              </div>

              {/* Accessory Details */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-2xl text-foreground">{accessory.name_ar}</h3>
                    {accessory.name && (
                      <p className="text-muted-foreground text-sm">{accessory.name}</p>
                    )}
                  </div>
                  <div className="text-left flex-shrink-0">
                    <span className="font-heading text-2xl text-gold">+{accessory.price}</span>
                    <span className="text-gold text-sm mr-1">{currency}</span>
                  </div>
                </div>

                {accessory.description_ar && (
                  <p className="text-foreground/70 leading-relaxed">
                    {accessory.description_ar}
                  </p>
                )}

                {/* Quantity Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-foreground">الكمية:</span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => onQuantityChange(-1)}
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="w-10 text-center font-heading text-2xl">{quantity}</span>
                    <button
                      onClick={() => onQuantityChange(1)}
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Add Button */}
                <Button
                  onClick={() => {
                    if (quantity === 0) onQuantityChange(1);
                    setShowPopup(false);
                  }}
                  className="w-full btn-gold py-6 font-heading text-lg"
                >
                  {quantity > 0 ? 'تم الإضافة ✓' : 'إضافة للمنتج'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccessoryCard;
