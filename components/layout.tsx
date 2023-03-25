interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="mx-auto flex flex-col space-y-4">
      <header className=" sticky top-0 z-40 bg-white">
        <div className="h-16 border-b border-b-slate-200 py-4">
          <nav className="justify-between flex mx-12">
            <a href="#" className="hover:text-slate-600 cursor-pointer">
              Home
            </a>
            <a href="mailto:aaronbesson@gmail.com" target="_blank" className="hover:text-slate-600 cursor-pointer">
              Contact
            </a>
          </nav>
        </div>
      </header>
      <div className="w-full">
        <main className="flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
