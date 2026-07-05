import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, Share2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
const flamingoLogo = '/icons/flamingo.jpeg';

const QRCodePage = () => {
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Use a fully qualified URL so phone cameras treat it as a website link
  const websiteUrl = new URL('/', window.location.origin).toString();

  const handleDownload = async () => {
    if (!qrRef.current) return;

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvasFn = html2canvasModule.default;
      
      const canvas = await html2canvasFn(qrRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = 'flamingo-qr-code.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: 'تم التحميل',
        description: 'تم تحميل الباركود بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الباركود',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Flamingo',
          text: 'تسوق منتجات فلامنجو الفاخرة',
          url: websiteUrl,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(websiteUrl);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ رابط الموقع',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-2xl shadow-primary/10 p-8 space-y-6 border border-primary/40">
          {/* QR Code Container */}
          <div
            ref={qrRef}
            className="bg-white rounded-xl p-6 mx-auto w-fit"
          >
            <div className="text-center mb-4">
              <img 
                src={flamingoLogo} 
                alt="Flamingo" 
                className="h-12 w-auto mx-auto object-contain"
              />
            </div>
            
            <div className="flex justify-center">
              <QRCodeSVG
                value={websiteUrl}
                size={200}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            
            <div className="text-center mt-4">
              <p className="text-gray-900 font-heading text-lg">Flamingo</p>
              <p className="text-gray-500 text-xs mt-1">امسح للتسوق</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleDownload}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-heading gap-2"
            >
              <Download className="w-5 h-5" />
              تحميل الباركود
            </Button>
            
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full h-12 rounded-xl font-heading gap-2 border-primary/30"
            >
              <Share2 className="w-5 h-5" />
              مشاركة الرابط
            </Button>
          </div>

          {/* Back Link */}
          <div className="text-center pt-4 border-t border-border/30">
            <Link 
              to="/home" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default QRCodePage;
