export function SourceCard({ title, content, score }) {
  return (
    <div className="bg-gray-50/80 border border-gray-200 rounded-md p-3">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        {title && <h4 className="font-medium text-gray-900 text-xs">{title}</h4>}
        {score && (
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
            {(score * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{content}</p>
    </div>
  );
}
