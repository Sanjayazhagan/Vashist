// src/components/Layout.tsx
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="flex h-screen">
      {/* Sidebar / Nav */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col p-4">
        <h1 className="text-xl font-bold mb-6">StudySphere</h1>
        <nav className="flex flex-col gap-2">
          <a href="/pools" className="hover:bg-gray-700 p-2 rounded">
            My Pools
          </a>
          <a href="/notes" className="hover:bg-gray-700 p-2 rounded">
            Notes
          </a>
          <a href="/chats" className="hover:bg-gray-700 p-2 rounded">
            Chats
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
