import RequiredProductOptionsGuard from "@/components/RequiredProductOptionsGuard";
import ProductDetailPageBase from "./ProductDetailPageBase";

const ProductDetailPage = () => (
  <RequiredProductOptionsGuard>
    <ProductDetailPageBase />
  </RequiredProductOptionsGuard>
);

export default ProductDetailPage;
