export default function ChartCard({ title }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow border">
      <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>

      <div className="h-48 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center text-gray-500">
        Chart Placeholder
      </div>
    </div>
  );
}
