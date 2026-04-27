import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { CommandesList } from "./CommandesList";

export default function AdminCommandesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
        </div>
      }
    >
      <CommandesList />
    </Suspense>
  );
}
