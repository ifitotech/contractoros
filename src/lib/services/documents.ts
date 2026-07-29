import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadDocument(params: {
  companyId: string;
  userId: string;
  file: File;
  relatedType: "project" | "quote" | "purchase_order" | "expense" | "client" | "company";
  relatedId: string;
}) {
  if (!ALLOWED_MIME_TYPES.includes(params.file.type)) {
    throw new Error(
      "Tipo de archivo no permitido. Usa PDF, JPG o PNG."
    );
  }

  if (params.file.size > MAX_FILE_SIZE) {
    throw new Error("El archivo no puede superar 10 MB.");
  }

  const supabase = await createClient();
  const ext = params.file.name.split(".").pop() ?? "bin";
  const storagePath = `${params.companyId}/${params.relatedType}/${params.relatedId}/${Date.now()}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, params.file, {
      contentType: params.file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Create document record
  const { data: doc, error: dbError } = await supabase
    .from("documents")
    .insert({
      company_id: params.companyId,
      uploaded_by: params.userId,
      name: params.file.name,
      mime_type: params.file.type,
      size_bytes: params.file.size,
      storage_path: storagePath,
      related_type: params.relatedType,
      related_id: params.relatedId,
    })
    .select()
    .single();

  if (dbError) throw dbError;

  // If related to PO, attach document and move status
  if (params.relatedType === "purchase_order") {
    await supabase
      .from("purchase_orders")
      .update({
        document_id: doc.id,
        status: "document_uploaded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.relatedId);

    await supabase.from("purchase_order_status_history").insert({
      purchase_order_id: params.relatedId,
      from_status: "pending_document",
      to_status: "document_uploaded",
      changed_by: params.userId,
      notes: "Documento subido",
    });
  }

  return doc;
}

export async function getDocumentUrl(storagePath: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600); // 1 hour

  return data?.signedUrl ?? null;
}
