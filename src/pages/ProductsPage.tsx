import RequiredProductOptionsGuard from "@/components/RequiredProductOptionsGuard";
import ProductsPageBase from "./ProductsPageBase";

const ProductsPage = () => (
  <RequiredProductOptionsGuard>
    <ProductsPageBase />
  </RequiredProductOptionsGuard>
);

export default ProductsPage;
