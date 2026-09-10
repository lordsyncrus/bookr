"use client";
import { Suspense } from "react";
import { useRouter } from "@/i18n/navigation";
import { AccountSettingsModal } from "@/components/account/account-settings-modal";
export default function AccountSettingsPage() {
  const router=useRouter();
  return <main className="account-route-shell"><Suspense fallback={null}><AccountSettingsModal open onOpenChange={open=>{if(!open)router.replace("/workspace");}}/></Suspense></main>;
}
