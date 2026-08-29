import AdminInternalNotesDock from "@/components/admin/AdminInternalNotesDock";
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";

const AdminOrdersWithNotesPage = () => (
  <>
    <AdminOrdersPage />
    <AdminInternalNotesDock mode="orders" label="ملاحظات الطلبات" />
  </>
);

export default AdminOrdersWithNotesPage;
