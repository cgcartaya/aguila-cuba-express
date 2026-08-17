"use client";
import {Loader2,MapPinned} from "lucide-react";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import MenuDeliveryZonesManager from "@/components/admin/menu/MenuDeliveryZonesManager";
import {useAdminAccess} from "@/hooks/useAdminAccess";
import {useStore} from "@/hooks/useStore";
export default function Page(){const {loading:a,isSuperAdmin,store:as}=useAdminAccess();const {store:ss,loading:b}=useStore();const store=isSuperAdmin?ss||as:as;if(a||b)return <main className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin"/></main>;if(!store?.id)return <main className="p-8 text-center">Selecciona una tienda.</main>;return <main className="mx-auto max-w-7xl px-4 py-6"><AdminPageHeader eyebrow="Menú" title="Zonas de delivery" description="Define dónde entregas, cuánto cuesta y el pedido mínimo." storeName={store.name} icon={MapPinned}/><div className="mt-6"><MenuDeliveryZonesManager storeId={store.id}/></div></main>}
