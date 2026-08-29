"use client";

import { supabase } from "@/lib/supabase";

export type Ingredient={
  id:string;store_id:string;name:string;unit:"g"|"ml"|"unit";
  package_quantity:number;package_cost:number;current_stock:number;
  waste_percent:number;notes:string|null;is_active:boolean;
};

export type MenuDish={id:string;name:string;price:number};

export type RecipeCost={
  recipe_id:string;menu_item_id:string;menu_item_name:string;sale_price:number;
  portions:number;packaging_cost:number;other_unit_cost:number;recipe_unit_cost:number;
};

export type RecipeLine={
  id:string;ingredient_id:string;quantity:number;
  restaurant_ingredients?:{id:string;name:string;unit:string;package_quantity:number;package_cost:number;waste_percent:number}|null;
};

export type ModifierCost={
  optionId:string;label:string;groupName:string;priceDelta:number;unitCost:number;
};

const n=(v:any)=>Number(v||0);

export async function getRestaurantIngredients(storeId:string):Promise<Ingredient[]>{
  const {data,error}=await supabase.from("restaurant_ingredients")
    .select("id,store_id,name,unit,package_quantity,package_cost,current_stock,waste_percent,notes,is_active")
    .eq("store_id",storeId).order("is_active",{ascending:false}).order("name");
  if(error)throw error;
  return (data||[]).map((x:any)=>({...x,package_quantity:n(x.package_quantity),package_cost:n(x.package_cost),current_stock:n(x.current_stock),waste_percent:n(x.waste_percent)}));
}

export async function saveIngredient(storeId:string,input:{
  id?:string;name:string;unit:"g"|"ml"|"unit";packageQuantity:number;packageCost:number;
  currentStock:number;wastePercent:number;notes?:string;isActive?:boolean;
}){
  const payload={
    store_id:storeId,name:input.name.trim(),unit:input.unit,
    package_quantity:Math.max(.0001,n(input.packageQuantity)),
    package_cost:Math.max(0,n(input.packageCost)),
    current_stock:Math.max(0,n(input.currentStock)),
    waste_percent:Math.min(99.9,Math.max(0,n(input.wastePercent))),
    notes:input.notes?.trim()||null,
    is_active:input.isActive??true,
    updated_at:new Date().toISOString(),
  };
  if(input.id)return supabase.from("restaurant_ingredients").update(payload).eq("id",input.id).eq("store_id",storeId).select().single();
  return supabase.from("restaurant_ingredients").insert(payload).select().single();
}

export async function getMenuDishes(storeId:string):Promise<MenuDish[]>{
  const {data,error}=await supabase.from("menu_items").select("id,name,price")
    .eq("store_id",storeId).eq("is_active",true).order("name");
  if(error)throw error;
  return (data||[]).map((x:any)=>({id:x.id,name:x.name,price:n(x.price)}));
}

export async function getRecipeCosts(storeId:string):Promise<RecipeCost[]>{
  const {data,error}=await supabase.from("restaurant_recipe_costs")
    .select("recipe_id,menu_item_id,menu_item_name,sale_price,portions,packaging_cost,other_unit_cost,recipe_unit_cost")
    .eq("store_id",storeId).order("menu_item_name");
  if(error)throw error;
  return (data||[]).map((x:any)=>({...x,sale_price:n(x.sale_price),portions:n(x.portions),packaging_cost:n(x.packaging_cost),other_unit_cost:n(x.other_unit_cost),recipe_unit_cost:n(x.recipe_unit_cost)}));
}

export async function getRecipe(storeId:string,menuItemId:string){
  const {data:recipe,error}=await supabase.from("restaurant_recipes")
    .select("id,store_id,menu_item_id,portions,packaging_cost,other_unit_cost,notes")
    .eq("store_id",storeId).eq("menu_item_id",menuItemId).maybeSingle();
  if(error)throw error;
  if(!recipe)return {recipe:null,lines:[] as RecipeLine[]};
  const {data:lines,error:lineError}=await supabase.from("restaurant_recipe_items")
    .select("id,ingredient_id,quantity,restaurant_ingredients:ingredient_id(id,name,unit,package_quantity,package_cost,waste_percent)")
    .eq("recipe_id",recipe.id).order("created_at");
  if(lineError)throw lineError;
  return {recipe:{...recipe,portions:n(recipe.portions),packaging_cost:n(recipe.packaging_cost),other_unit_cost:n(recipe.other_unit_cost)},
    lines:(lines||[]).map((x:any)=>({...x,quantity:n(x.quantity)})) as RecipeLine[]};
}

export async function saveRecipe(storeId:string,input:{
  menuItemId:string;portions:number;packagingCost:number;otherUnitCost:number;notes?:string;
  lines:Array<{ingredientId:string;quantity:number}>;
}){
  const {data:recipe,error}=await supabase.from("restaurant_recipes").upsert({
    store_id:storeId,menu_item_id:input.menuItemId,
    portions:Math.max(.0001,n(input.portions)),
    packaging_cost:Math.max(0,n(input.packagingCost)),
    other_unit_cost:Math.max(0,n(input.otherUnitCost)),
    notes:input.notes?.trim()||null,updated_at:new Date().toISOString()
  },{onConflict:"store_id,menu_item_id"}).select("id").single();
  if(error||!recipe)return {error};
  const {error:delError}=await supabase.from("restaurant_recipe_items").delete().eq("recipe_id",recipe.id).eq("store_id",storeId);
  if(delError)return {error:delError};
  const rows=input.lines.filter(x=>x.ingredientId&&n(x.quantity)>0).map(x=>({
    recipe_id:recipe.id,store_id:storeId,ingredient_id:x.ingredientId,quantity:n(x.quantity)
  }));
  if(!rows.length)return {error:null};
  const {error:insertError}=await supabase.from("restaurant_recipe_items").insert(rows);
  return {error:insertError};
}

export async function getModifierCosts(storeId:string):Promise<ModifierCost[]>{
  const {data,error}=await supabase.from("menu_items").select(`
    id,store_id,
    menu_item_option_groups(
      id,name,
      menu_item_options(id,label,price_delta)
    )
  `).eq("store_id",storeId);
  if(error)throw error;

  const {data:costRows,error:costError}=await supabase.from("restaurant_modifier_costs")
    .select("option_id,unit_cost").eq("store_id",storeId);
  if(costError)throw costError;
  const map=new Map((costRows||[]).map((r:any)=>[r.option_id,n(r.unit_cost)]));

  const out:ModifierCost[]=[];
  for(const item of data||[]){
    for(const group of (item as any).menu_item_option_groups||[]){
      for(const option of group.menu_item_options||[]){
        out.push({optionId:option.id,label:option.label,groupName:group.name,priceDelta:n(option.price_delta),unitCost:map.get(option.id)||0});
      }
    }
  }
  return out.sort((a,b)=>a.groupName.localeCompare(b.groupName)||a.label.localeCompare(b.label));
}

export async function saveModifierCost(storeId:string,optionId:string,unitCost:number){
  return supabase.from("restaurant_modifier_costs").upsert({
    store_id:storeId,option_id:optionId,unit_cost:Math.max(0,n(unitCost)),updated_at:new Date().toISOString()
  },{onConflict:"store_id,option_id"});
}

export async function addWaste(storeId:string,input:{ingredientId:string;quantity:number;reason?:string;date:string}){
  return supabase.from("restaurant_waste_entries").insert({
    store_id:storeId,ingredient_id:input.ingredientId,quantity:Math.max(.0001,n(input.quantity)),
    reason:input.reason?.trim()||null,waste_date:input.date
  });
}
