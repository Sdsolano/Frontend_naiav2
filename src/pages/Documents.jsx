const Documents = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-800">Documents</h1>
          <p className="text-gray-600">This is the documents section where you can manage your files.</p>
        </div>
  
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Your Documents</h2>
            <p className="text-gray-600">No documents found. Start by uploading a new document.</p>
  
            <div className="flex gap-3 mt-2">
              <button className="px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                Upload Document
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                Create New
              </button>
            </div>
          </div>
        </div>
  
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Recent Documents</h2>
            <p className="text-gray-600">Your recently accessed documents will appear here.</p>
          </div>
  
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Shared With You</h2>
            <p className="text-gray-600">Documents shared with you by others will be listed here.</p>
          </div>
        </div>
      </div>
    )
  }
  
  export default Documents
  