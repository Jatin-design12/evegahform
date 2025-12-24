import EmployeeTopbar from "../EmployeeTopbar";
import Watermark from "../Watermark";

export default function EmployeeLayout({ children }) {
  return (
    <div className="relative z-10 flex h-screen flex-col bg-evegah-bg overflow-hidden">
      <Watermark />
      <div className="sticky top-0 z-20">
        <EmployeeTopbar />
      </div>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}