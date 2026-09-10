"use client";
import { Component, Suspense, type ComponentProps, type ReactNode } from "react";
import { AccountSettings } from "@hexclave/next";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@hexclave/ui";
import { useLocale } from "next-intl";
import { X, Settings, LoaderCircle } from "lucide-react";

class AccountErrorBoundary extends Component<{children:ReactNode;en:boolean},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="account-modal-message" role="alert"><p>{this.props.en?"Could not load account settings. Your manuscript is unchanged.":"Non è stato possibile caricare le impostazioni account. Il manoscritto è invariato."}</p><button className="studio-button secondary" onClick={()=>this.setState({failed:false})}>{this.props.en?"Retry":"Riprova"}</button></div>:this.props.children;}
}
export function AccountSettingsModal({open,onOpenChange,extraItems}:{open:boolean;onOpenChange:(open:boolean)=>void;extraItems?:ComponentProps<typeof AccountSettings>["extraItems"]}) {
  const en=useLocale()==="en";
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent noCloseButton className="bookr-account-modal hexclave-private" overlayProps={{className:"bookr-account-overlay"}} onPointerDownOutside={event=>event.preventDefault()}>
    <header className="account-modal-header"><span className="account-modal-symbol"><Settings size={21}/></span><div><DialogTitle>{en?"Account settings":"Impostazioni account"}</DialogTitle><DialogDescription>{en?"Profile, sign-in and account preferences.":"Profilo, accesso e preferenze del tuo account."}</DialogDescription></div><DialogClose className="account-modal-close" aria-label={en?"Close settings":"Chiudi impostazioni"}><X size={20}/></DialogClose></header>
    <div className="account-modal-body"><AccountErrorBoundary en={en}><Suspense fallback={<div className="account-modal-message" role="status"><LoaderCircle className="animate-spin" size={22}/>{en?"Loading settings…":"Caricamento impostazioni…"}<div className="account-modal-skeleton"/><div className="account-modal-skeleton"/></div>}><AccountSettings fullPage={false} extraItems={extraItems}/></Suspense></AccountErrorBoundary></div>
  </DialogContent></Dialog>;
}
