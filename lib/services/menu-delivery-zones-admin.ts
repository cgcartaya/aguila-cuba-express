import { supabase } from "@/lib/supabase";
export type MenuDeliveryZone={id:string;store_id:string;name:string;fee:number;minimum_order:number;estimated_minutes_min:number|null;estimated_minutes_max:number|null;sort_order:number;is_active:boolean};
export const getDeliveryZones=(storeId:string)=>supabase.from("menu_delivery_zones").select("*").eq("store_id",storeId).order("sort_order");
export async function saveDeliveryZone(storeId:string,z:Partial<MenuDeliveryZone>&{name:string}){
 const payload={store_id:storeId,name:z.name.trim(),fee:Number(z.fee)||0,minimum_order:Number(z.minimum_order)||0,estimated_minutes_min:z.estimated_minutes_min||null,estimated_minutes_max:z.estimated_minutes_max||null,sort_order:z.sort_order||0,is_active:z.is_active!==false,updated_at:new Date().toISOString()};
 return z.id?supabase.from("menu_delivery_zones").update(payload).eq("id",z.id).select().single():supabase.from("menu_delivery_zones").insert(payload).select().single();
}
export const deleteDeliveryZone=(id:string)=>supabase.from("menu_delivery_zones").delete().eq("id",id);
