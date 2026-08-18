from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    # Resume only the steps that come after the first script stopped.
    payment = ROOT / "src/pages/admin/AdminPaymentMethodsPage.tsx"
    text = payment.read_text(encoding="utf-8")

    lines = text.splitlines(keepends=True)
    blocked = {
        '<SelectItem value="card">بطاقة</SelectItem>',
        '<SelectItem value="wallet">محفظة إلكترونية</SelectItem>',
    }
    removed = 0
    kept = []
    for line in lines:
        if line.strip() in blocked:
            removed += 1
            continue
        kept.append(line)
    text = "".join(kept)
    if removed != 4:
        raise RuntimeError(f"Expected to remove 4 unsupported payment options, removed {removed}")

    anchor = '      if (!nameAr) throw new Error("الاسم العربي مطلوب.");'
    validation = (
        '\n      if (!["cash", "bank"].includes(methodForm.type)) throw new Error("نوع الدفع غير مدعوم في صفحة الدفع الحالية.");'
        '\n      if (methodForm.type === "bank" && code !== "bank") throw new Error("كود التحويل البنكي يجب أن يكون bank حتى يتوافق مع صفحة الدفع.");'
        '\n      if (methodForm.type === "cash" && !["cash", "cod"].includes(code)) throw new Error("كود الدفع النقدي يجب أن يكون cash أو cod حتى يتوافق مع صفحة الدفع.");'
    )
    if validation.strip() not in text:
        if anchor not in text:
            raise RuntimeError("Payment validation anchor not found")
        text = text.replace(anchor, anchor + validation, 1)

    text = text.replace('placeholder="cod أو transfer"', 'placeholder="cash أو cod أو bank"')
    payment.write_text(text, encoding="utf-8")

    # Remove the duplicated customer brand-section route pair (keep the first pair).
    app = ROOT / "src/App.tsx"
    text = app.read_text(encoding="utf-8")
    pair = (
        '            <Route path="/brands/:slug/sections/:sectionSlug" element={<ProtectedRoute><BrandSectionPage /></ProtectedRoute>} />\n'
        '            <Route path="/brand/:slug/sections/:sectionSlug" element={<ProtectedRoute><BrandSectionPage /></ProtectedRoute>} />\n'
    )
    count = text.count(pair)
    if count == 2:
        first = text.find(pair)
        second = text.find(pair, first + len(pair))
        text = text[:second] + text[second + len(pair):]
    elif count != 1:
        raise RuntimeError(f"Expected 1 or 2 brand route pairs, found {count}")
    app.write_text(text, encoding="utf-8")

    # Remove the temporary Vite source-rewrite guard now that source files are fixed directly.
    vite = ROOT / "vite.config.ts"
    vite_text = vite.read_text(encoding="utf-8")
    start = vite_text.find("const launchReadinessGuard = (): Plugin => ({")
    end_marker = "\n\n// https://vitejs.dev/config/"
    end = vite_text.find(end_marker)
    if start != -1:
        if end == -1 or end <= start:
            raise RuntimeError("Could not locate end of launchReadinessGuard in vite.config.ts")
        vite_text = vite_text[:start] + vite_text[end + 2:]
    vite_text = vite_text.replace('import { defineConfig, type Plugin } from "vite";', 'import { defineConfig } from "vite";')
    vite_text = vite_text.replace("    launchReadinessGuard(),\n", "")
    vite.write_text(vite_text, encoding="utf-8")

    print("Post-audit fixes resumed successfully.")


if __name__ == "__main__":
    main()
