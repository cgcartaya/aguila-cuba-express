/** Read every authorized page before publishing totals or applying local filters. */
export async function loadDriverPages<T extends {id:string}>(fetchPage:(page:number)=>Promise<{rows:T[];hasMore:boolean}>){
 const unique=new Map<string,T>();let page=0;
 while(true){const result=await fetchPage(page++);for(const row of result.rows)unique.set(row.id,row);if(!result.hasMore)return [...unique.values()];if(!result.rows.length)throw new Error('Listado incompleto. Actualiza para reintentar.');}
}
