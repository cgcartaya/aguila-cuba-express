export async function readDashboardPages<T>(fetchPage:(start:number,end:number)=>PromiseLike<{data:T[]|null;error:{message:string}|null}>){
 const rows:T[]=[];const size=500;
 for(let start=0;;start+=size){const result=await fetchPage(start,start+size-1);if(result.error)return {data:null,error:result.error};rows.push(...(result.data||[]));if((result.data?.length||0)<size)return {data:rows,error:null};}
}
