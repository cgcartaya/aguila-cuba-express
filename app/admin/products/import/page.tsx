"use client";

import { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Upload, Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

type ImportProduct = {
  row: number;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  tag: string;
  is_active: boolean;
  status: "valid" | "error" | "duplicate";
  errors: string[];
};

const REQUIRED_COLUMNS = ["name", "category", "description", "price", "stock"];

const VALID_CATEGORIES = [
  "Electrónicos",
  "Alimentos",
  "Hogar",
  "Medicinas",
  "Deportes",
];

function normalize(value: unknown) {
  return String(value || "").trim();
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export default function ImportProductsPage() {
  const [products, setProducts] = useState<ImportProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage("");
    setProducts([]);

    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setMessage("El archivo debe ser Excel (.xlsx o .xls).");
      return;
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);

const sheetName =
  workbook.SheetNames.find(
    (name) => name.toLowerCase().trim() === "productos"
  ) || workbook.SheetNames[0];

const sheet = workbook.Sheets[sheetName];

const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
  header: 1,
  defval: "",
});

if (matrix.length === 0) {
  setMessage("El archivo está vacío.");
  return;
}

const headerRowIndex = matrix.findIndex((row) => {
  const normalized = row.map((cell) =>
    String(cell || "").toLowerCase().trim()
  );

  return REQUIRED_COLUMNS.every((column) => normalized.includes(column));
});

if (headerRowIndex === -1) {
  setMessage(
    "No se encontró una fila de encabezados válida. Debe incluir: name, category, description, price, stock."
  );
  return;
}

const headers = matrix[headerRowIndex].map((cell) =>
  String(cell || "").toLowerCase().trim()
);

const dataRows = matrix.slice(headerRowIndex + 1);

const rows = dataRows
  .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
  .map((row) => {
    const normalizedRow: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      if (header) {
        normalizedRow[header] = row[index];
      }
    });

    return normalizedRow;
  });

const columns = headers;

    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) => !columns.includes(column)
    );

    if (missingColumns.length > 0) {
      setMessage(`Faltan columnas obligatorias: ${missingColumns.join(", ")}`);
      return;
    }

    const { data: existingProducts } = await supabase
      .from("products")
      .select("name, sku");

    const existingNames = new Set(
      existingProducts?.map((p) => normalizeName(p.name)) || []
    );

const existingSkus = new Set(
  existingProducts
    ?.map((p) => normalize(p.sku))
    .filter((sku) => sku.length > 0) || []
);

    const namesInFile = new Set<string>();
    const skusInFile = new Set<string>();

    const formatted: ImportProduct[] = rows.map((row, index) => {
    const excelRow = headerRowIndex + index + 2;

      const sku = normalize(row.sku);
      const name = normalize(row.name);
      const category = normalize(row.category);
      const description = normalize(row.description);
      const price = Number(row.price);
      const stock = Number(row.stock);
      const image_url = normalize(row.image_url);
      const tag = normalize(row.tag);

      const is_active =
        row.is_active === true ||
        row.is_active === "true" ||
        row.is_active === "TRUE" ||
        row.is_active === 1 ||
        row.is_active === undefined ||
        row.is_active === "";

      const errors: string[] = [];

      if (!name || name.length < 3) {
        errors.push("Nombre obligatorio, mínimo 3 caracteres.");
      }

      if (!category) {
        errors.push("Categoría obligatoria.");
      }

      if (category && !VALID_CATEGORIES.includes(category)) {
        errors.push(`Categoría inválida: ${category}`);
      }

      if (!description || description.length < 10) {
        errors.push("Descripción obligatoria, mínimo 10 caracteres.");
      }

      if (Number.isNaN(price) || price <= 0) {
        errors.push("Precio inválido.");
      }

      if (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
        errors.push("Stock inválido. Debe ser entero y mayor o igual a 0.");
      }

      const normalizedName = normalizeName(name);

      let status: ImportProduct["status"] = "valid";

      if (existingNames.has(normalizedName)) {
        status = "duplicate";
        errors.push("Ya existe un producto con ese nombre.");
      }

      if (namesInFile.has(normalizedName)) {
        status = "duplicate";
        errors.push("Producto duplicado dentro del Excel.");
      }

      if (sku) {
        if (existingSkus.has(sku)) {
          status = "duplicate";
          errors.push("Ya existe un producto con ese SKU.");
        }

        if (skusInFile.has(sku)) {
          status = "duplicate";
          errors.push("SKU duplicado dentro del Excel.");
        }

        skusInFile.add(sku);
      }

      namesInFile.add(normalizedName);

      if (errors.length > 0 && status !== "duplicate") {
        status = "error";
      }

      return {
        row: excelRow,
        sku,
        name,
        category,
        description,
        price,
        stock,
        image_url,
        tag,
        is_active,
        status,
        errors,
      };
    });

    setProducts(formatted);
  };

  const validProducts = products.filter((p) => p.status === "valid");
  const duplicatedProducts = products.filter((p) => p.status === "duplicate");
  const errorProducts = products.filter((p) => p.status === "error");

  const importProducts = async () => {
    setMessage("");

    if (validProducts.length === 0) {
      setMessage("No hay productos válidos para importar.");
      return;
    }

    setLoading(true);

    const payload = validProducts.map((product) => ({
      sku: product.sku || null,
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      tag: product.tag,
      is_active: product.is_active,
    }));

    const { error } = await supabase.from("products").insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage("Error importando productos.");
      return;
    }

    setMessage(`${validProducts.length} productos importados correctamente.`);
    setProducts([]);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/products"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a productos
        </Link>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black text-gray-900">
            Importar productos
          </h1>

          <p className="mt-2 text-gray-500">
            Sube un Excel con columnas: sku, name, category, description, price,
            stock, image_url, tag, is_active.
          </p>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center hover:bg-gray-50">
            <Upload size={36} className="mb-3 text-gray-500" />

            <p className="font-bold text-gray-900">Subir archivo Excel</p>

            <p className="text-sm text-gray-500">Formato .xlsx o .xls</p>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          {products.length > 0 && (
            <>
              <section className="mt-6 grid gap-4 md:grid-cols-3">
                <SummaryCard
                  icon={<CheckCircle size={22} />}
                  title="Válidos"
                  value={validProducts.length}
                  className="bg-green-50 text-green-700"
                />

                <SummaryCard
                  icon={<AlertTriangle size={22} />}
                  title="Duplicados"
                  value={duplicatedProducts.length}
                  className="bg-yellow-50 text-yellow-700"
                />

                <SummaryCard
                  icon={<XCircle size={22} />}
                  title="Con errores"
                  value={errorProducts.length}
                  className="bg-red-50 text-red-700"
                />
              </section>

              <div className="mt-6 overflow-hidden rounded-2xl border">
                <div className="bg-gray-50 px-4 py-3 font-bold">
                  Vista previa: {products.length} filas
                </div>

                <div className="divide-y">
                  {products.map((product) => (
                    <div
                      key={`${product.row}-${product.name}`}
                      className="grid gap-3 px-4 py-4 text-sm md:grid-cols-6"
                    >
                      <p className="font-bold">Fila {product.row}</p>

                      <div className="md:col-span-2">
                        <p className="font-bold text-gray-900">
                          {product.name || "Sin nombre"}
                        </p>
                        <p className="text-gray-500">{product.sku || "Sin SKU"}</p>
                      </div>

                      <p>{product.category}</p>

                      <p>${Number(product.price || 0).toFixed(2)}</p>

                      <div>
                        <StatusBadge status={product.status} />

                        {product.errors.length > 0 && (
                          <ul className="mt-2 list-disc pl-4 text-xs text-red-600">
                            {product.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {message && (
            <div className="mt-5 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700">
              {message}
            </div>
          )}

          <button
            onClick={importProducts}
            disabled={loading || validProducts.length === 0}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 font-bold text-white disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Importando...
              </>
            ) : (
              `Importar ${validProducts.length} productos válidos`
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl p-4 font-bold ${className}`}>
      <div className="mb-2">{icon}</div>
      <p>{title}</p>
      <p className="text-3xl">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportProduct["status"] }) {
  if (status === "valid") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        Válido
      </span>
    );
  }

  if (status === "duplicate") {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
        Duplicado
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
      Error
    </span>
  );
}