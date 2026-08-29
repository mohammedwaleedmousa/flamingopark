export type XlsxCellValue = string | number | boolean | null;

const decoder = new TextDecoder("utf-8");

const readU16 = (view: DataView, offset: number) => view.getUint16(offset, true);
const readU32 = (view: DataView, offset: number) => view.getUint32(offset, true);

const findEndOfCentralDirectory = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.length - 65557);
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (readU32(view, offset) === 0x06054b50) return offset;
  }
  throw new Error("ملف Excel غير صالح أو غير مكتمل");
};

const inflateRaw = async (bytes: Uint8Array) => {
  const StreamCtor = (globalThis as typeof globalThis & { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!StreamCtor) throw new Error("المتصفح لا يدعم فك ضغط ملفات Excel");
  const stream = new Blob([bytes]).stream().pipeThrough(new StreamCtor("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const unzip = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectory(bytes);
  const entryCount = readU16(view, endOffset + 10);
  const centralOffset = readU32(view, endOffset + 16);
  const entries = new Map<string, Uint8Array>();

  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (readU32(view, offset) !== 0x02014b50) throw new Error("بنية ZIP داخل Excel غير متوقعة");
    const compression = readU16(view, offset + 10);
    const compressedSize = readU32(view, offset + 20);
    const nameLength = readU16(view, offset + 28);
    const extraLength = readU16(view, offset + 30);
    const commentLength = readU16(view, offset + 32);
    const localOffset = readU32(view, offset + 42);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (readU32(view, localOffset) !== 0x04034b50) throw new Error("مدخل ZIP غير صالح");
    const localNameLength = readU16(view, localOffset + 26);
    const localExtraLength = readU16(view, localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);

    let data: Uint8Array;
    if (compression === 0) data = compressed.slice();
    else if (compression === 8) data = await inflateRaw(compressed);
    else throw new Error(`نوع ضغط Excel غير مدعوم (${compression})`);

    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
};

const xml = (entries: Map<string, Uint8Array>, path: string, optional = false) => {
  const value = entries.get(path);
  if (!value) {
    if (optional) return null;
    throw new Error(`ملف Excel يفتقد ${path}`);
  }
  const doc = new DOMParser().parseFromString(decoder.decode(value), "application/xml");
  if (doc.querySelector("parsererror")) throw new Error(`تعذر قراءة ${path}`);
  return doc;
};

const parseSharedStrings = (doc: Document | null) => {
  if (!doc) return [] as string[];
  return Array.from(doc.getElementsByTagName("si")).map((item) =>
    Array.from(item.getElementsByTagName("t")).map((node) => node.textContent ?? "").join(""),
  );
};

const columnIndexFromRef = (ref: string) => {
  const letters = ref.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let result = 0;
  for (const char of letters) result = result * 26 + (char.charCodeAt(0) - 64);
  return Math.max(0, result - 1);
};

const parseCell = (cell: Element, shared: string[]): XlsxCellValue => {
  const type = cell.getAttribute("t") || "n";
  if (type === "inlineStr") {
    return Array.from(cell.getElementsByTagName("t")).map((node) => node.textContent ?? "").join("");
  }
  const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
  if (type === "s") return shared[Number(raw)] ?? "";
  if (type === "b") return raw === "1";
  if (type === "str" || type === "e") return raw;
  if (raw === "") return null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : raw;
};

export const readFirstWorksheet = async (file: File): Promise<XlsxCellValue[][]> => {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("اختر ملف بصيغة .xlsx");
  const entries = await unzip(file);
  const shared = parseSharedStrings(xml(entries, "xl/sharedStrings.xml", true));
  const sheet = xml(entries, "xl/worksheets/sheet1.xml");
  if (!sheet) return [];

  const result: XlsxCellValue[][] = [];
  const rowNodes = Array.from(sheet.getElementsByTagName("row"));
  for (const rowNode of rowNodes) {
    const row: XlsxCellValue[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagName("c"))) {
      const ref = cell.getAttribute("r") || "A1";
      row[columnIndexFromRef(ref)] = parseCell(cell, shared);
    }
    result.push(row);
  }
  return result;
};

const normalizeHeader = (value: XlsxCellValue) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");

export const readXlsxObjects = async (file: File) => {
  const rows = await readFirstWorksheet(file);
  if (rows.length < 2) return [] as Array<Record<string, XlsxCellValue>>;
  const headers = rows[0].map(normalizeHeader);
  if (!headers.some(Boolean)) throw new Error("صف العناوين في Excel فارغ");

  return rows.slice(1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null]).filter(([header]) => Boolean(header))))
    .filter((row) => Object.values(row).some((value) => value !== null && String(value).trim() !== ""));
};
