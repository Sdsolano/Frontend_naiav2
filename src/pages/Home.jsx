const Home = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-800">Home</h1>
          <p className="text-gray-600">Welcome to the home page. This is where you can add your home content.</p>
        </div>
  
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Getting Started</h2>
            <p className="text-gray-600">
              Navigate through the application using the sidebar. You can access NAIA, Documents, and return to this Home
              page at any time.
            </p>
          </div>
  
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Recent Activity</h2>
            <p className="text-gray-600">Your recent activity will appear here. Check back later for updates.</p>
          </div>
  
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Quick Actions</h2>
            <p className="text-gray-600">Common actions and shortcuts will be displayed in this section.</p>
          </div>
        </div>
      </div>
    )
  }
  
  export default Home
  