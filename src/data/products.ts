import { Product, Country } from '@/store/useStore';

export const products: Product[] = [
  {
    id: '1',
    name: 'Royal Gold Necklace',
    nameAr: 'قلادة ذهب ملكية',
    slug: 'royal-gold-necklace',
    price: 2500,
    originalPrice: 3000,
    discount: 17,
    description: 'Exquisite 24K gold necklace with intricate royal design',
    descriptionAr: 'قلادة ذهب عيار 24 مع تصميم ملكي فاخر',
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    ],
    category: 'necklaces',
    brand: 'Flamingo',
    inStock: true,
    countries: ['YE', 'SA'],
    isFeatured: true,
    isBestSeller: true,
  },
  {
    id: '2',
    name: 'Diamond Crown Ring',
    nameAr: 'خاتم التاج الماسي',
    slug: 'diamond-crown-ring',
    price: 1800,
    description: '18K white gold ring with diamond crown design',
    descriptionAr: 'خاتم ذهب أبيض عيار 18 بتصميم تاج ماسي',
    images: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800',
    ],
    category: 'rings',
    brand: 'Flamingo',
    inStock: true,
    countries: ['YE', 'SA'],
    isFeatured: true,
  },
  {
    id: '3',
    name: 'Elegance Bracelet',
    nameAr: 'سوار الأناقة',
    slug: 'elegance-bracelet',
    price: 1200,
    originalPrice: 1500,
    discount: 20,
    description: 'Stunning 22K gold bracelet with elegant patterns',
    descriptionAr: 'سوار ذهب عيار 22 بنقوش أنيقة',
    images: [
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    ],
    category: 'bracelets',
    brand: 'Luxury Gold',
    inStock: true,
    countries: ['YE', 'SA'],
    isBestSeller: true,
  },
  {
    id: '4',
    name: 'Pearl Drop Earrings',
    nameAr: 'أقراط اللؤلؤ المتدلية',
    slug: 'pearl-drop-earrings',
    price: 950,
    description: 'Beautiful gold earrings with natural pearls',
    descriptionAr: 'أقراط ذهبية جميلة مع لؤلؤ طبيعي',
    images: [
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    ],
    category: 'earrings',
    brand: 'Pearl Collection',
    inStock: true,
    countries: ['SA'],
    isFeatured: true,
  },
  {
    id: '5',
    name: 'Heritage Gold Set',
    nameAr: 'طقم الذهب التراثي',
    slug: 'heritage-gold-set',
    price: 4500,
    originalPrice: 5500,
    discount: 18,
    description: 'Complete traditional gold jewelry set',
    descriptionAr: 'طقم مجوهرات ذهبية تراثية كاملة',
    images: [
      'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=800',
    ],
    category: 'sets',
    brand: 'Flamingo',
    inStock: true,
    countries: ['YE'],
    isFeatured: true,
    isBestSeller: true,
  },
  {
    id: '6',
    name: 'Minimalist Gold Chain',
    nameAr: 'سلسلة ذهب بسيطة',
    slug: 'minimalist-gold-chain',
    price: 800,
    description: 'Delicate 18K gold chain for everyday elegance',
    descriptionAr: 'سلسلة ذهب عيار 18 رقيقة للأناقة اليومية',
    images: [
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
    ],
    category: 'necklaces',
    brand: 'Modern Gold',
    inStock: true,
    countries: ['YE', 'SA'],
  },
];

export const brands = [
  { id: '1', name: 'Flamingo', logo: '💎' },
  { id: '2', name: 'Luxury Gold', logo: '👑' },
  { id: '3', name: 'Pearl Collection', logo: '🦪' },
  { id: '4', name: 'Modern Gold', logo: '✨' },
  { id: '5', name: 'Heritage', logo: '🏛️' },
];

export const banners = [
  {
    id: '1',
    title: 'Discover Timeless Elegance',
    titleAr: 'اكتشف الأناقة الخالدة',
    subtitle: 'Exclusive Collection 2024',
    subtitleAr: 'مجموعة حصرية 2024',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920',
    cta: 'Shop Now',
    ctaAr: 'تسوق الآن',
    countries: ['YE', 'SA'] as Country[],
  },
  {
    id: '2',
    title: 'Royal Gold Collection',
    titleAr: 'مجموعة الذهب الملكي',
    subtitle: 'Up to 20% Off Selected Items',
    subtitleAr: 'خصم يصل إلى 20% على منتجات مختارة',
    image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1920',
    cta: 'Explore',
    ctaAr: 'استكشف',
    countries: ['YE', 'SA'] as Country[],
  },
];

export const reviews = [
  {
    id: '1',
    name: 'Sarah Ahmed',
    nameAr: 'سارة أحمد',
    rating: 5,
    message: 'Absolutely stunning jewelry! The quality is exceptional.',
    messageAr: 'مجوهرات رائعة! الجودة استثنائية.',
    country: 'SA' as Country,
  },
  {
    id: '2',
    name: 'Mohammed Ali',
    nameAr: 'محمد علي',
    rating: 5,
    message: 'Best gold shop experience. Highly recommended!',
    messageAr: 'أفضل تجربة شراء ذهب. أنصح به بشدة!',
    country: 'YE' as Country,
  },
  {
    id: '3',
    name: 'Fatima Hassan',
    nameAr: 'فاطمة حسن',
    rating: 4,
    message: 'Beautiful designs and excellent customer service.',
    messageAr: 'تصاميم جميلة وخدمة عملاء ممتازة.',
    country: 'SA' as Country,
  },
];

export const deliveryCompanies = {
  YE: [
    { id: '1', name: 'Yemen Express', fee: 50, days: '2-3' },
    { id: '2', name: 'Fast Delivery YE', fee: 75, days: '1-2' },
  ],
  SA: [
    { id: '1', name: 'Aramex', fee: 30, days: '1-2' },
    { id: '2', name: 'SMSA', fee: 25, days: '2-3' },
    { id: '3', name: 'DHL Express', fee: 45, days: '1' },
  ],
};

export const getProductsByCountry = (country: Country): Product[] => {
  return products.filter(p => p.countries.includes(country));
};

export const getFeaturedProducts = (country: Country): Product[] => {
  return products.filter(p => p.countries.includes(country) && p.isFeatured);
};

export const getBestSellers = (country: Country): Product[] => {
  return products.filter(p => p.countries.includes(country) && p.isBestSeller);
};

export const getProductBySlug = (slug: string): Product | undefined => {
  return products.find(p => p.slug === slug);
};
