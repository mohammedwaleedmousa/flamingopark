-- Add image positioning columns to banners table
ALTER TABLE public.banners 
ADD COLUMN IF NOT EXISTS image_zoom numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS image_position_x numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS image_position_y numeric DEFAULT 50;