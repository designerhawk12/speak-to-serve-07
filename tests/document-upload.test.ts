import { describe, expect, test } from "bun:test";
import type { DocumentRequestItemRow, DocumentRow } from "../src/lib/cpgrams/data-access";
import { storageObjectAlreadyExists, uniqueDocuments } from "../src/lib/cpgrams/data-access";
import { requiredDocumentProgress } from "../src/lib/cpgrams/citizen-case";

describe("document upload presentation", () => {
  test("deduplicates a repeated document row without hiding separately supplied request items", () => {
    const ppo = { id: "ppo", file_name: "ppo.pdf" } as DocumentRow;
    const bank = { id: "bank", file_name: "bank.pdf" } as DocumentRow;
    expect(uniqueDocuments([ppo, ppo, bank])).toEqual([ppo, bank]);
  });

  test("keeps incomplete required items visible until every item is supplied", () => {
    const items = [
      { id: "ppo", is_required: true, document_id: "document-ppo" },
      { id: "bank", is_required: true, document_id: null },
      { id: "order", is_required: true, document_id: null },
    ] as DocumentRequestItemRow[];
    expect(requiredDocumentProgress(items)).toEqual({ required: 3, supplied: 1 });
    expect(
      requiredDocumentProgress(
        items.map((item) =>
          item.id === "bank" ? { ...item, document_id: "document-bank" } : item,
        ),
      ),
    ).toEqual({ required: 3, supplied: 2 });
    expect(
      requiredDocumentProgress(
        items.map((item) => ({ ...item, document_id: `document-${item.id}` })),
      ),
    ).toEqual({ required: 3, supplied: 3 });
  });

  test("treats an existing private object as a retryable finalization, not a new upload", () => {
    expect(
      storageObjectAlreadyExists({ statusCode: 409, message: "The resource already exists" }),
    ).toBe(true);
    expect(storageObjectAlreadyExists({ statusCode: 403, message: "Access denied" })).toBe(false);
  });
});
