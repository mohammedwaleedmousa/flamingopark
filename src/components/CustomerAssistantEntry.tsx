import { lazy, Suspense, useState } from "react";
import { MessageCircle } from "lucide-react";

const CustomerAssistant = lazy(() => import("./CustomerAssistant"));

export default function CustomerAssistantEntry() {
  const [requested, setRequested] = useState(false);

  if (requested) return <Suspense fallback={null}><CustomerAssistant initialOpen /></Suspense>;

  return <button type="button" onClick={() => setRequested(true)} className="fixed bottom-5 left-4 z-[60] grid h-14 w-14 rounded-lg border border-primary/20 bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 max-sm:bottom-3 max-sm:left-3" aria-label="فتح مساعد المتجر"><MessageCircle className="h-6 w-6" /></button>;
}
