from pathlib import Path

# Customer auth defaults: Yemen (+967), Aden, while keeping global phone support.
p = Path('src/pages/CustomerAuthPage.tsx')
text = p.read_text(encoding='utf-8')
old = 'const [formData, setFormData] = useState({ name: "", phone: "", password: "", region: "" });'
new = 'const [formData, setFormData] = useState({ name: "", phone: "+967", password: "", region: "عدن" });'
if old not in text:
    raise RuntimeError('formData initializer not found')
text = text.replace(old, new, 1)
text = text.replace('placeholder="+9665xxxxxxxx أو +1xxxxxxxxxx"', 'placeholder="+9677xxxxxxxx"')
p.write_text(text, encoding='utf-8')

# App-wide session synchronization.
p = Path('src/App.tsx')
text = p.read_text(encoding='utf-8')
anchor = 'import CustomerAssistantEntry from "@/components/CustomerAssistantEntry";'
if anchor not in text:
    raise RuntimeError('App import anchor not found')
text = text.replace(anchor, anchor + '\nimport CustomerSessionSync from "@/components/CustomerSessionSync";', 1)
anchor2 = '      <Sonner />\n      <DateRangeProvider>'
if anchor2 not in text:
    raise RuntimeError('App render anchor not found')
text = text.replace(anchor2, '      <Sonner />\n      <CustomerSessionSync />\n      <DateRangeProvider>', 1)
p.write_text(text, encoding='utf-8')
print('persistent session defaults applied')