// Future Vision layout — accessible to all roles, clearly labeled inactive
export default function FutureVisionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
        Future Vision / Not Active in Foundation Light
      </div>
      {children}
    </div>
  );
}
