import { trackAnalyticsEvent } from "@/lib/analytics/client";
export function trackAddToCart(storeId:string,item:any){trackAnalyticsEvent({storeId,eventName:"add_to_cart",productId:item.type==="product"?String(item.id).replace(/^product-/,""):null,comboId:item.type==="combo"?String(item.id).replace(/^combo-/,""):null,itemName:item.name,quantity:1,value:Number(item.price||0)});}
