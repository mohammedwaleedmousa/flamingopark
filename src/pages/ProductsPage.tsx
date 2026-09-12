import RequiredProductOptionsGuard from "@/components/RequiredProductOptionsGuard";
import ProductsPageServer from "./ProductsPageServer";

const ProductsPage = () => (
  <RequiredProductOptionsGuard>
    <ProductsPageServer />
  </RequiredProductOptionsGuard>
);

export default ProductsPage;
