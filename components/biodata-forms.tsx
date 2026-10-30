"use client";

import { ActionForm, ConfirmCheck, Hidden, TextArea } from "./form";
import { deleteBiodataAction } from "@/lib/actions/biodata";
import { setApprovalAction } from "@/lib/actions/profiles";
import type { Approval } from "@/lib/db/schema";

/** The ghotok's two buttons on a biodata a family handed in: list it, or send it back with a note. */
export function ApprovalForm({ id, current }: { id: string; current: Approval }) {
  return (
    <div className="flex flex-col gap-4">
      {current !== "approved" ? (
        <ActionForm action={setApprovalAction} submitLabel="তালিকায় তুলুন" pendingLabel="তোলা হচ্ছে…">
          {() => (
            <>
              <Hidden name="id" value={id} />
              <Hidden name="decision" value="approved" />
            </>
          )}
        </ActionForm>
      ) : null}
      <ActionForm action={setApprovalAction} submitLabel={current === "approved" ? "তালিকা থেকে সরিয়ে ফেরত দিন" : "ফেরত দিন"} tone="danger">
        {(v) => (
          <>
            <Hidden name="id" value={id} />
            <Hidden name="decision" value="returned" />
            <TextArea name="note" label="পরিবারকে যা জানাতে চান" placeholder="যেমন: জন্ম সাল আর অভিভাবকের নম্বর ঠিক করে দিন" defaultValue={v.note} rows={2} />
          </>
        )}
      </ActionForm>
    </div>
  );
}

/** A family takes back a biodata the ghotok has not listed yet. */
export function DeleteBiodataForm({ id }: { id: string }) {
  return (
    <ActionForm action={deleteBiodataAction} submitLabel="মুছে ফেলুন" tone="danger">
      {() => (
        <>
          <Hidden name="id" value={id} />
          <ConfirmCheck label="হ্যাঁ, এই বায়োডাটা মুছে যাবে।" />
        </>
      )}
    </ActionForm>
  );
}
