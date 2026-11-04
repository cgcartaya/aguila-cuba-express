"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { activeAdminHref, type AdminSection } from "@/lib/admin/nav-config";

const AccordionContext = createContext<{open:string|null;toggle:(title:string)=>void}|null>(null);

/** Key this group by tenant and pathname: route changes reveal their own section. */
export function AdminNavAccordion({sections,pathname,children}:{sections:AdminSection[];pathname:string;children:ReactNode}){
  const active=activeAdminHref(sections.flatMap(section=>section.links),pathname);
  const initial=sections.find(section=>section.links.some(link=>link.href===active))?.title || sections[0]?.title || null;
  const [open,setOpen]=useState<string|null>(initial);
  return <AccordionContext.Provider value={{open,toggle:title=>setOpen(current=>current===title?null:title)}}><div className="space-y-2">{children}</div></AccordionContext.Provider>;
}

export function AdminNavAccordionSection({title,children}:{title:string;children:ReactNode}){
  const context=useContext(AccordionContext);
  const id=useId();
  if(!context)throw new Error("Section requires an accordion group");
  const expanded=context.open===title;
  return <section>
    <h2><button type="button" aria-expanded={expanded} aria-controls={id} onClick={event=>{
      const button=event.currentTarget;
      const scroller=button.closest<HTMLElement>('[data-admin-scroll]');
      context.toggle(title);
      // Adjust only this menu's scroll, never the page behind it. No height animation.
      requestAnimationFrame(()=>{
        if(!scroller||!button.isConnected)return;
        const bounds=scroller.getBoundingClientRect(), rect=button.getBoundingClientRect();
        if(rect.top<bounds.top)scroller.scrollTop-=bounds.top-rect.top;
        else if(rect.bottom>bounds.bottom)scroller.scrollTop+=rect.bottom-bounds.bottom;
      });
    }} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-xs font-black uppercase tracking-wider hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2">
      <span>{title}</span><ChevronDown size={16} aria-hidden="true" className={expanded?"rotate-180 shrink-0":"shrink-0"}/>
    </button></h2>
    <div id={id} hidden={!expanded} className="pb-2 pt-1">{children}</div>
  </section>;
}
