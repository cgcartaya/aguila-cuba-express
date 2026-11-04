import type { Metadata, Viewport } from 'next';
import './portal.css';
export const metadata:Metadata={
  title:{absolute:'Repartidores'}, description:'Tus envíos asignados y evidencias de entrega.',
  applicationName:'Repartidores', manifest:'/repartidores/manifest.webmanifest',
  appleWebApp:{capable:true,title:'Repartidores',statusBarStyle:'default'},
  icons:{icon:'/repartidores/icon/192',apple:'/repartidores/icon/180'},
  robots:{index:false,follow:false},
};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#133f39'};
export default function Layout({children}:{children:React.ReactNode}) { return children; }
