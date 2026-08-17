from pathlib import Path

p=Path('src/pages/CheckoutPage.tsx')
s=p.read_text(encoding='utf-8')
a='      p_payment_method: paymentMethod,\n'
b='      p_payment_method: isCashPayment ? "cod" : paymentMethod,\n'
assert a in s
p.write_text(s.replace(a,b,1),encoding='utf-8')

p=Path('src/pages/CartPage.tsx')
s=p.read_text(encoding='utf-8')
a='''\n                  <div className="flex items-center justify-between">\n                    <span className="text-[9px] text-[#897A75]">{getSiteText(content, "cart_shipping_label", "الشحن")}</span>\n                    <span className="text-[9px] font-semibold text-[#73856E]">{getSiteText(content, "cart_shipping_value", "مجاني")}</span>\n                  </div>\n\n                  <div className="flex items-center justify-between">\n                    <span className="text-[9px] text-[#897A75]">الضريبة</span>\n                    <span className="text-[9px] text-[#A99B96]">تحدد عند الدفع</span>\n                  </div>\n'''
assert a in s
p.write_text(s.replace(a,'\n',1),encoding='utf-8')

p=Path('src/components/CartDrawerContent.tsx')
s=p.read_text(encoding='utf-8')
if 'import { useCurrency } from "@/lib/currency";' not in s:
    s=s.replace('import { useStore } from "@/store/useStore";\n','import { useStore } from "@/store/useStore";\nimport { useCurrency } from "@/lib/currency";\n',1)
a='  const total = getCartTotal();\n  const currency = "ر.ي";\n'
b='  const total = getCartTotal();\n  const { symbol: currency } = useCurrency();\n'
assert a in s
p.write_text(s.replace(a,b,1),encoding='utf-8')
print('checkout-cart fixed')