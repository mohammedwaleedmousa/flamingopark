import { useParams } from "react-router-dom";
import AdminInternalNotesDock from "@/components/admin/AdminInternalNotesDock";
import AdminCustomerDetailPage from "@/pages/admin/AdminCustomerDetailPage";

const AdminCustomerDetailWithNotesPage = () => {
  const { id } = useParams();

  return (
    <>
      <AdminCustomerDetailPage />
      {id ? <AdminInternalNotesDock mode="customer" entityId={id} label="ملاحظات العميل" /> : null}
    </>
  );
};

export default AdminCustomerDetailWithNotesPage;
