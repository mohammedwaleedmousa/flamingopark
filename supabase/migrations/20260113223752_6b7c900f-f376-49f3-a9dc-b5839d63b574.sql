-- Create admin notifications table
CREATE TABLE public.admin_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    related_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    related_beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notifications
CREATE POLICY "Admins can manage notifications"
ON public.admin_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to notify admin on beneficiary order
CREATE OR REPLACE FUNCTION public.notify_admin_on_beneficiary_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification if order has a beneficiary
    IF NEW.beneficiary_id IS NOT NULL THEN
        INSERT INTO public.admin_notifications (
            title,
            message,
            type,
            related_order_id,
            related_beneficiary_id
        )
        SELECT 
            'طلب جديد من مستفيد',
            'تم استلام طلب جديد #' || NEW.order_number || ' عبر المستفيد: ' || b.name || ' (كود: ' || b.code || ') - المبلغ: ' || NEW.total,
            'beneficiary_order',
            NEW.id,
            NEW.beneficiary_id
        FROM public.beneficiaries b
        WHERE b.id = NEW.beneficiary_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER on_beneficiary_order_created
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_beneficiary_order();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;