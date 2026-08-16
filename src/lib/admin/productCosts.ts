import { supabase } from "@/integrations/supabase/client";

type AdminProductCostRow = {
  product_id: string;
  cost_price: number | string | null;
};

export async function fetchAdminProductCostMap(productIds?: string[]): Promise<Map<string, number | null>> {
  if (productIds && productIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_admin_product_costs", {
    p_product_ids: productIds?.length ? productIds : null,
  });

  if (error) throw error;

  return new Map(
    ((data || []) as AdminProductCostRow[]).map((row) => [
      row.product_id,
      row.cost_price == null ? null : Number(row.cost_price),
    ]),
  );
}
