import { useMutation } from "@tanstack/react-query";
import { DocumentCard } from "./DocumentCard";
import { toDocumentRecord } from "@/lib/cpgrams/data-adapters";
import { createAuthorizedDocumentUrl, type DocumentRow } from "@/lib/cpgrams/data-access";
import { openPrivateDocumentFromClick } from "@/lib/cpgrams/private-document-open";
import { queryErrorDetail } from "@/lib/cpgrams/queries";

export function PrivateDocumentCard({ document, compact = false }: { document: DocumentRow; compact?: boolean }) {
  const open = useMutation({
    mutationFn: () => openPrivateDocumentFromClick(
      () => createAuthorizedDocumentUrl(document.id),
      () => window.open("about:blank", "_blank") as ReturnType<typeof window.open>,
    ),
  });
  return <div className="space-y-1"><DocumentCard document={toDocumentRecord(document)} compact={compact} onOpen={() => open.mutate()} />{open.isError && <p className="text-xs text-critical" role="alert">{queryErrorDetail(open.error)}</p>}</div>;
}
