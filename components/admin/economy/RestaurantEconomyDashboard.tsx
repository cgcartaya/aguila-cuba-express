"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {Beef,Calculator,Loader2,Plus,Save,Trash2,UtensilsCrossed,Wheat} from "lucide-react";
import {
  addWaste,getMenuDishes,getModifierCosts,getRecipe,getRecipeCosts,getRestaurantIngredients,
  saveIngredient,saveModifierCost,saveRecipe,
  type Ingredient,type MenuDish,type ModifierCost,type RecipeCost
} from "@/lib/services/economy-restaurant";

type Tab="ingredients"|"recipes"|"modifiers"|"waste";
type RecipeDraft={ingredientId:string;quantity:string};

export default function RestaurantEconomyDashboard({storeId,currency="USD"}:{storeId:string;currency?:string}){
  const [tab,setTab]=useState<Tab>("ingredients");
  const [loading,setLoading]=useState(true);
  const [ingredients,setIngredients]=useState<Ingredient[]>([]);
  const [dishes,setDishes]=useState<MenuDish[]>([]);
  const [recipeCosts,setRecipeCosts]=useState<RecipeCost[]>([]);
  const [modifiers,setModifiers]=useState<ModifierCost[]>([]);
  const [ingredientOpen,setIngredientOpen]=useState(false);
  const [editingIngredient,setEditingIngredient]=useState<Ingredient|null>(null);
  const [recipeDishId,setRecipeDishId]=useState("");
  const [recipeOpen,setRecipeOpen]=useState(false);

  const money=useMemo(()=>new Intl.NumberFormat(currency==="CUP"?"es-CU":"en-US",{style:"currency",currency,maximumFractionDigits:currency==="CUP"?0:2}),[currency]);

  async function load(){
    setLoading(true);
    try{
      const [i,d,r,m]=await Promise.all([getRestaurantIngredients(storeId),getMenuDishes(storeId),getRecipeCosts(storeId),getModifierCosts(storeId)]);
      setIngredients(i);setDishes(d);setRecipeCosts(r);setModifiers(m);
    }catch(e){console.error(e);window.alert("No se pudo cargar el costeo del restaurante.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[storeId]);

  const averageMargin=recipeCosts.length
    ? recipeCosts.reduce((s,r)=>s+(r.sale_price>0?((r.sale_price-r.recipe_unit_cost)/r.sale_price)*100:0),0)/recipeCosts.length
    : 0;

  if(loading)return <div className="mt-5 flex min-h-72 items-center justify-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700" size={30}/></div>;

  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Ingredientes" value={String(ingredients.length)} note={`${ingredients.filter(i=>i.is_active).length} activos`} icon={Wheat}/>
      <Metric title="Platos costeados" value={String(recipeCosts.length)} note={`${dishes.length} platos activos`} icon={UtensilsCrossed}/>
      <Metric title="Margen medio" value={`${averageMargin.toFixed(1)}%`} note="Sobre recetas configuradas" icon={Calculator}/>
      <Metric title="Modificadores" value={String(modifiers.length)} note={`${modifiers.filter(m=>m.unitCost>0).length} con costo`} icon={Beef}/>
    </section>

    <section className="mt-5 flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      {[
        ["ingredients","Ingredientes"],["recipes","Recetas / Escandallos"],["modifiers","Modificadores"],["waste","Merma"]
      ].map(([value,label])=><button key={value} type="button" onClick={()=>setTab(value as Tab)}
        className={`rounded-xl px-4 py-2.5 text-sm font-black ${tab===value?"bg-[#061b3a] text-white":"bg-slate-100 text-slate-600"}`}>{label}</button>)}
    </section>

    {tab==="ingredients"&&<IngredientsTab ingredients={ingredients} money={money} onNew={()=>{setEditingIngredient(null);setIngredientOpen(true)}} onEdit={i=>{setEditingIngredient(i);setIngredientOpen(true)}}/>}
    {tab==="recipes"&&<RecipesTab dishes={dishes} costs={recipeCosts} money={money} onEdit={id=>{setRecipeDishId(id);setRecipeOpen(true)}}/>}
    {tab==="modifiers"&&<ModifiersTab modifiers={modifiers} money={money} storeId={storeId} reload={load}/>}
    {tab==="waste"&&<WasteTab ingredients={ingredients} storeId={storeId}/>}

    {ingredientOpen&&<IngredientModal storeId={storeId} ingredient={editingIngredient} close={()=>setIngredientOpen(false)} saved={async()=>{setIngredientOpen(false);await load()}}/>}
    {recipeOpen&&<RecipeModal storeId={storeId} menuItemId={recipeDishId} dishes={dishes} ingredients={ingredients} money={money} close={()=>setRecipeOpen(false)} saved={async()=>{setRecipeOpen(false);await load()}}/>}
  </>;
}

function Metric({title,value,note,icon:Icon}:{title:string;value:string;note:string;icon:any}){
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={19}/></span><p className="mt-4 text-xs font-black uppercase text-slate-400">{title}</p><p className="mt-1 text-2xl font-black text-[#061b3a]">{value}</p><p className="mt-1 text-xs font-semibold text-slate-400">{note}</p></div>
}

function IngredientsTab({ingredients,money,onNew,onEdit}:{ingredients:Ingredient[];money:Intl.NumberFormat;onNew:()=>void;onEdit:(i:Ingredient)=>void}){
  return <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-[#061b3a]">Ingredientes</h2><p className="text-sm text-slate-500">El costo base se obtiene del costo del paquete dividido entre su cantidad útil.</p></div><button onClick={onNew} className="inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-4 py-2.5 text-sm font-black text-white"><Plus size={16}/>Nuevo ingrediente</button></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Ingrediente</th><th>Unidad</th><th>Paquete</th><th>Costo paquete</th><th>Costo base</th><th>Merma</th></tr></thead><tbody className="divide-y">
      {ingredients.map(i=>{const base=i.package_quantity>0?i.package_cost/i.package_quantity:0;return <tr key={i.id} onClick={()=>onEdit(i)} className="cursor-pointer hover:bg-slate-50"><td className="px-4 py-4 font-black text-slate-800">{i.name}</td><td>{i.unit}</td><td>{i.package_quantity}</td><td>{money.format(i.package_cost)}</td><td className="font-black">{money.format(base)}/{i.unit}</td><td>{i.waste_percent.toFixed(1)}%</td></tr>})}
    </tbody></table></div>
  </section>
}

function RecipesTab({dishes,costs,money,onEdit}:{dishes:MenuDish[];costs:RecipeCost[];money:Intl.NumberFormat;onEdit:(id:string)=>void}){
  const map=new Map(costs.map(c=>[c.menu_item_id,c]));
  return <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div><h2 className="text-lg font-black text-[#061b3a]">Recetas y escandallos</h2><p className="text-sm text-slate-500">Define cuánto ingrediente consume una porción y conoce el margen real del plato.</p></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">{dishes.map(d=>{const c=map.get(d.id);const cost=c?.recipe_unit_cost||0;const gain=d.price-cost;const margin=d.price>0?gain/d.price*100:0;return <button key={d.id} onClick={()=>onEdit(d.id)} className="rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300">
      <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{d.name}</p><p className="text-xs text-slate-400">Venta {money.format(d.price)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${c?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>{c?"Costeado":"Sin receta"}</span></div>
      <div className="mt-4 grid grid-cols-3 gap-2"><Mini label="Costo" value={money.format(cost)}/><Mini label="Ganancia" value={money.format(gain)}/><Mini label="Margen" value={`${margin.toFixed(1)}%`}/></div>
    </button>})}</div>
  </section>
}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-2"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-800">{value}</p></div>}

function ModifiersTab({modifiers,money,storeId,reload}:{modifiers:ModifierCost[];money:Intl.NumberFormat;storeId:string;reload:()=>Promise<void>}){
  const [draft,setDraft]=useState<Record<string,string>>({});
  return <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Costo de modificadores</h2><p className="text-sm text-slate-500">Comprueba si cada extra deja margen suficiente.</p>
    <div className="mt-4 space-y-2">{modifiers.map(m=>{const value=draft[m.optionId]??String(m.unitCost||"");const gain=m.priceDelta-Number(value||0);return <div key={m.optionId} className="grid gap-3 rounded-2xl border p-3 md:grid-cols-[1fr_140px_140px_120px] md:items-center">
      <div><p className="font-black text-slate-800">{m.label}</p><p className="text-xs text-slate-400">{m.groupName}</p></div><div><p className="text-[10px] font-black uppercase text-slate-400">Se cobra</p><p className="font-black">{money.format(m.priceDelta)}</p></div><input type="number" min="0" step=".01" value={value} onChange={e=>setDraft({...draft,[m.optionId]:e.target.value})} placeholder="Costo" className="rounded-xl border p-2.5"/><button onClick={async()=>{await saveModifierCost(storeId,m.optionId,Number(value||0));await reload()}} className="rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white">Guardar · {money.format(gain)}</button>
    </div>})}</div>
  </section>
}

function WasteTab({ingredients,storeId}:{ingredients:Ingredient[];storeId:string}){
  const [ingredientId,setIngredientId]=useState("");const [qty,setQty]=useState("");const [reason,setReason]=useState("");const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  async function submit(e:FormEvent){e.preventDefault();if(!ingredientId||Number(qty)<=0)return;const {error}=await addWaste(storeId,{ingredientId,quantity:Number(qty),reason,date});if(error)window.alert(error.message);else{setQty("");setReason("");window.alert("Merma registrada.");}}
  return <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Registrar merma</h2><p className="text-sm text-slate-500">Pérdidas por preparación, deterioro o manipulación.</p>
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-4"><select required value={ingredientId} onChange={e=>setIngredientId(e.target.value)} className="rounded-xl border p-3"><option value="">Ingrediente</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><input type="number" min=".0001" step=".0001" required value={qty} onChange={e=>setQty(e.target.value)} placeholder="Cantidad" className="rounded-xl border p-3"/><input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="rounded-xl border p-3"/><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo" className="rounded-xl border p-3"/><button className="md:col-span-4 rounded-xl bg-[#061b3a] px-4 py-3 font-black text-white">Registrar merma</button></form>
  </section>
}

function IngredientModal({storeId,ingredient,close,saved}:{storeId:string;ingredient:Ingredient|null;close:()=>void;saved:()=>Promise<void>}){
  const [name,setName]=useState(ingredient?.name||"");const [unit,setUnit]=useState<"g"|"ml"|"unit">(ingredient?.unit||"g");const [pq,setPq]=useState(String(ingredient?.package_quantity||1000));const [pc,setPc]=useState(String(ingredient?.package_cost||""));const [stock,setStock]=useState(String(ingredient?.current_stock||0));const [waste,setWaste]=useState(String(ingredient?.waste_percent||0));const [saving,setSaving]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setSaving(true);const {error}=await saveIngredient(storeId,{id:ingredient?.id,name,unit,packageQuantity:Number(pq),packageCost:Number(pc),currentStock:Number(stock),wastePercent:Number(waste),isActive:ingredient?.is_active??true});setSaving(false);if(error)window.alert(error.message);else await saved();}
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-3"><form onSubmit={submit} className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{ingredient?"Editar ingrediente":"Nuevo ingrediente"}</h2><button type="button" onClick={close}>✕</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre" className="rounded-xl border p-3"/><select value={unit} onChange={e=>setUnit(e.target.value as any)} className="rounded-xl border p-3"><option value="g">gramos (g)</option><option value="ml">mililitros (ml)</option><option value="unit">unidad</option></select><input type="number" min=".0001" step=".0001" required value={pq} onChange={e=>setPq(e.target.value)} placeholder="Cantidad del paquete" className="rounded-xl border p-3"/><input type="number" min="0" step=".01" required value={pc} onChange={e=>setPc(e.target.value)} placeholder="Costo del paquete" className="rounded-xl border p-3"/><input type="number" min="0" step=".0001" value={stock} onChange={e=>setStock(e.target.value)} placeholder="Stock actual" className="rounded-xl border p-3"/><input type="number" min="0" max="99" step=".1" value={waste} onChange={e=>setWaste(e.target.value)} placeholder="% merma" className="rounded-xl border p-3"/></div><button disabled={saving} className="mt-5 w-full rounded-xl bg-[#061b3a] px-4 py-3 font-black text-white">{saving?"Guardando...":"Guardar ingrediente"}</button></form></div>
}

function RecipeModal({storeId,menuItemId,dishes,ingredients,money,close,saved}:{storeId:string;menuItemId:string;dishes:MenuDish[];ingredients:Ingredient[];money:Intl.NumberFormat;close:()=>void;saved:()=>Promise<void>}){
  const [portions,setPortions]=useState("1");const [packaging,setPackaging]=useState("0");const [other,setOther]=useState("0");const [lines,setLines]=useState<RecipeDraft[]>([{ingredientId:"",quantity:""}]);const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{const x=await getRecipe(storeId,menuItemId);if(x.recipe){setPortions(String(x.recipe.portions));setPackaging(String(x.recipe.packaging_cost));setOther(String(x.recipe.other_unit_cost));setLines(x.lines.length?x.lines.map(l=>({ingredientId:l.ingredient_id,quantity:String(l.quantity)})):[{ingredientId:"",quantity:""}])}setLoading(false)})()},[storeId,menuItemId]);
  if(loading)return <div className="fixed inset-0 z-[130] grid place-items-center bg-black/50"><Loader2 className="animate-spin text-white"/></div>;
  const dish=dishes.find(d=>d.id===menuItemId);const ingredientMap=new Map(ingredients.map(i=>[i.id,i]));
  const ingredientCost=lines.reduce((s,l)=>{const i=ingredientMap.get(l.ingredientId);if(!i||i.package_quantity<=0)return s;const base=i.package_cost/i.package_quantity;const adjusted=base*(i.waste_percent>0?1/(1-i.waste_percent/100):1);return s+adjusted*Number(l.quantity||0)},0)/Math.max(.0001,Number(portions||1));
  const total=ingredientCost+Number(packaging||0)+Number(other||0);const margin=(dish?.price||0)>0?((dish!.price-total)/dish!.price)*100:0;
  async function submit(e:FormEvent){e.preventDefault();const {error}=await saveRecipe(storeId,{menuItemId,portions:Number(portions),packagingCost:Number(packaging),otherUnitCost:Number(other),lines:lines.map(l=>({ingredientId:l.ingredientId,quantity:Number(l.quantity)}))});if(error)window.alert(error.message);else await saved();}
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-3"><form onSubmit={submit} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-blue-600">Escandallo</p><h2 className="text-xl font-black">{dish?.name}</h2></div><button type="button" onClick={close}>✕</button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><input type="number" min=".0001" step=".0001" value={portions} onChange={e=>setPortions(e.target.value)} placeholder="Porciones producidas" className="rounded-xl border p-3"/><input type="number" min="0" step=".01" value={packaging} onChange={e=>setPackaging(e.target.value)} placeholder="Envase/porción" className="rounded-xl border p-3"/><input type="number" min="0" step=".01" value={other} onChange={e=>setOther(e.target.value)} placeholder="Otros/porción" className="rounded-xl border p-3"/></div><div className="mt-5 space-y-2">{lines.map((l,n)=><div key={n} className="grid gap-2 sm:grid-cols-[1fr_160px_44px]"><select required value={l.ingredientId} onChange={e=>setLines(lines.map((x,j)=>j===n?{...x,ingredientId:e.target.value}:x))} className="rounded-xl border p-3"><option value="">Ingrediente</option>{ingredients.filter(i=>i.is_active).map(i=><option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select><input required type="number" min=".0001" step=".0001" value={l.quantity} onChange={e=>setLines(lines.map((x,j)=>j===n?{...x,quantity:e.target.value}:x))} placeholder="Cantidad" className="rounded-xl border p-3"/><button type="button" disabled={lines.length===1} onClick={()=>setLines(lines.filter((_,j)=>j!==n))} className="rounded-xl bg-rose-50 text-rose-600"><Trash2 className="mx-auto" size={16}/></button></div>)}</div><button type="button" onClick={()=>setLines([...lines,{ingredientId:"",quantity:""}])} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700"><Plus size={15}/>Agregar ingrediente</button><div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3"><Mini label="Costo por porción" value={money.format(total)}/><Mini label="Precio venta" value={money.format(dish?.price||0)}/><Mini label="Margen" value={`${margin.toFixed(1)}%`}/></div><button className="mt-5 w-full rounded-xl bg-[#061b3a] px-4 py-3 font-black text-white"><Save size={16} className="mr-2 inline"/>Guardar receta</button></form></div>
}
