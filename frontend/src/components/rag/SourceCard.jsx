export function SourceCard({ title, content, score }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        {title && <h4 className="font-medium text-gray-900 text-sm">{title}</h4>}
        {score && (
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
            {(score * 100).toFixed(0)}% match
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 line-clamp-3">{content}</p>
    </div>
  );
}
