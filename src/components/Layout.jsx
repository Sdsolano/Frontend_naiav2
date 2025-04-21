"use client"

import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "./Slidebar"

const Layout = () => {
  const location = useLocation()
  const isNaiaRoute = location.pathname === "/naia"

  return (
    <div className={`min-h-screen ${!isNaiaRoute ? "bg-gradient-to-br from-gray-50 to-sky-50" : ""}`}>
      <Sidebar />
      <main className={isNaiaRoute ? "w-full h-screen" : "p-6 pt-24 md:p-8 md:pt-24 max-w-7xl mx-auto"}>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
