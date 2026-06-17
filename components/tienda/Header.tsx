import Image from "next/image";
import Link from "next/link";

type HeaderProps = {
  cartCount: number;
};

export default function Header({ cartCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <button className="text-3xl font-black" suppressHydrationWarning>
          ☰
        </button>

        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Águila Cuba Express"
            width={52}
            height={52}
            className="rounded-full"
          />

          <div className="leading-tight">
            <h1 className="text-lg font-black uppercase md:text-2xl">
              ÁGUILA CUBA EXPRESS
            </h1>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Envíos a Cuba
            </p>
          </div>
        </div>

<Link href="/cart" className="relative text-3xl" suppressHydrationWarning>
  🛒
  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
    {cartCount}
  </span>
</Link>
      </div>
    </header>
  );
}