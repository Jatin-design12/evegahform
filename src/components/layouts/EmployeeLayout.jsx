import EmployeeTopbar from "../EmployeeTopbar";

export default function EmployeeLayout({ children }) {
  return (
    <div className="flex h-screen flex-col bg-evegah-bg overflow-hidden">
      <div className="sticky top-0 z-20">
        <EmployeeTopbar />
      </div>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}