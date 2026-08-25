import Script from "next/script";

const META_PIXEL_ID = "908444339001405";

/**
 * Meta Pixel exclusivo de Aguila Express USA.
 *
 * La plataforma comparte este layout entre varias tiendas. La validación se
 * ejecuta antes de descargar fbevents.js para no enviar a Meta visitas de
 * DeParis, YOYO, Perla Marketplace ni del panel administrativo.
 */
export default function MetaPixel() {
  return (
    <Script id="aguila-meta-pixel" strategy="afterInteractive">
      {`
        (function () {
          var host = window.location.hostname.toLowerCase().replace(/^www\\./, '');
          var isAguilaDomain = host === 'aguilaexpressusa.com';
          var isAdmin = window.location.pathname === '/admin' || window.location.pathname.indexOf('/admin/') === 0;

          if (!isAguilaDomain || isAdmin) return;
          if (window.fbq) return;

          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');

          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        })();
      `}
    </Script>
  );
}
