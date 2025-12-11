import { motion } from 'framer-motion';
import { brands } from '@/data/products';

const BrandsStrip = () => {
  return (
    <section className="py-12 bg-muted border-y border-border/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-8 md:gap-16 flex-wrap"
        >
          {brands.map((brand, index) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center group cursor-pointer"
            >
              <div className="text-4xl mb-2 transition-transform duration-300 group-hover:scale-110">
                {brand.logo}
              </div>
              <p className="text-xs text-muted-foreground font-body tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                {brand.name}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default BrandsStrip;
