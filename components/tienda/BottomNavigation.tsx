import Link from "next/link";
import {
  House,
  Package,
  ShoppingBag,
  CalendarDays,
  MessageCircle,
} from "lucide-react";

export default function BottomNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-2 shadow-lg md:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5 text-center text-xs font-bold text-slate-500">
        
        <Link href="/" className="flex flex-col items-center">
          <House size={20} />
          <span>Inicio</span>
        </Link>

        <Link href="/rastrear" className="flex flex-col items-center">
          <Package size={20} />
          <span>Rastrear</span>
        </Link>

        <Link
          href="/tienda"
          className="flex flex-col items-center text-red-600"
        >
          <ShoppingBag size={20} />
          <span>Tienda</span>
        </Link>

        <Link href="/" className="flex flex-col items-center">
          <CalendarDays size={20} />
          <span>Salidas</span>
        </Link>

        <button className="flex flex-col items-center text-green-600">
          <MessageCircle size={20} />
          <span>Ayuda</span>
        </button>

      </div>
    </nav>
  );
}