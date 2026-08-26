import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DocumentRequestItemRow, DocumentRequestRow, DocumentRow } from "@/lib/cpgrams/data-access";
import { uploadCitizenDocument } from "@/lib/cpgrams/data-access";
import { requiredDocumentProgress } from "@/lib/cpgrams/citizen-case";
import { cpgramsQueryKeys, queryErrorDetail } from "@/lib/cpgrams/queries";

interface CitizenDocumentRequestChecklistProps {
  grievanceId: string;
  userId: string;
  requests: DocumentRequestRow[];
  items: DocumentRequestItemRow[];
  documents: DocumentRow[];
}

export function CitizenDocumentRequestChecklist({
  grievanceId,
  userId,
  requests,
  items,
  documents,
}: CitizenDocumentRequestChecklistProps) {
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | undefined>>({});
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: ({ file, requestItemId }: { file: File; requestItemId?: string }) =>
      uploadCitizenDocument({ grievanceId, userId, file, ...(requestItemId ? { requestItemId } : {}) }),
    onSuccess: async () => {
      setUploadMessage("Document uploaded and recorded on this case.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cpgramsQueryKeys.grievance(grievanceId) }),
        queryClient.invalidateQueries({ queryKey: ["cpgrams", "citizen-grievances"] }),
      ]);
    },
  });

  function selectFile(itemId: string, event: ChangeEvent<HTMLInputElement>) {
    setUploadMessage(null);
    setSelectedFiles((current) => ({ ...current, [itemId]: event.target.files?.[0] }));
  }

  const documentsById = new Map(documents.map((document) => [document.id, document]));

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const requestItems = items.filter((item) => item.request_id === request.id);
        const progress = requiredDocumentProgress(requestItems);
        return (
          <section key={request.id} className="space-y-3 rounded-lg border border-warning/35 bg-warning-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{request.reason}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {progress.supplied} of {progress.required} required documents supplied
                </p>
              </div>
              {request.fulfilled_at && <span className="text-xs font-semibold text-success">Request completed</span>}
            </div>
            <ul className="space-y-3">
              {requestItems.map((item) => {
                const attachedDocument = item.document_id ? documentsById.get(item.document_id) : undefined;
                const selectedFile = selectedFiles[item.id];
                const isCurrentUpload = upload.isPending && upload.variables?.requestItemId === item.id;
                return (
                  <li key={item.id} className="rounded-md border border-border bg-background p-3">
                    <div className="flex gap-2">
                      <CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${attachedDocument ? "text-success" : "text-muted-foreground"}`} aria-hidden />
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm font-medium">{item.label}{item.is_required ? " (required)" : " (optional)"}</p>
                        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                        {attachedDocument ? <p className="text-sm text-success">Supplied: {attachedDocument.file_name}</p> : <div className="flex flex-wrap items-center gap-2"><Input type="file" aria-label={`Choose file for ${item.label}`} onChange={(event) => selectFile(item.id, event)} disabled={upload.isPending} /><Button size="sm" disabled={!selectedFile || upload.isPending} onClick={() => selectedFile && upload.mutate({ file: selectedFile, requestItemId: item.id })}><Upload className="size-4" aria-hidden />{isCurrentUpload ? "Uploading" : "Upload"}</Button></div>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {uploadMessage && <p className="text-sm text-success" role="status">{uploadMessage}</p>}
      {upload.isError && <p className="text-sm text-critical" role="alert">{queryErrorDetail(upload.error)}</p>}
    </div>
  );
}
