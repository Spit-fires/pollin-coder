export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
        <p className="text-gray-400">Loading chat...</p>
      </div>
    </div>
  );
}
