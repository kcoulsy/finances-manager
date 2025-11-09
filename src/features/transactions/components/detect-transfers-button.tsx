"use client";

import { Button } from "@/features/shared/components/ui/button";
import { detectTransfersAction } from "../actions/detect-transfers.action";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";

export function DetectTransfersButton() {
  const { execute, status } = useActionWithToast(detectTransfersAction);

  const handleDetect = async () => {
    await execute({});
  };

  return (
    <Button
      variant="outline"
      onClick={handleDetect}
      disabled={status === "executing"}
    >
      {status === "executing" ? "Detecting..." : "Detect Transfers"}
    </Button>
  );
}

