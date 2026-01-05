import ReactMarkdown from "react-markdown";

export function SourceCard({ title, content, score, retrieval_score }) {
  return (
    <div className="bg-gray-50/80 border border-gray-200 rounded-md p-3 hover:bg-white hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        {title && <h4 className="font-medium text-gray-900 text-xs">{title}</h4>}
        <div className="flex items-center gap-1.5 ">
          {/* Final Score (Resonance) */}
          {score && (
            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100" title="Resonance Score (Reranked)">
              R: {Number(score).toFixed(4)}
            </span>
          )}

          {/* Retrieval Score (Vector) */}
          {retrieval_score && (
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100" title="Vector Score (Cosine Similarity)">
              V: {Number(retrieval_score).toFixed(4)}
            </span>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-600 line-clamp-4 leading-relaxed prose prose-xs max-w-none">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline cursor-pointer relative z-10"
                onClick={(e) => e.stopPropagation()}
              />
            ),
            p: ({ node, ...props }) => <span {...props} /> // Render paragraphs as spans to avoid hydration mismatches within line-clamp if possible, or just standard p
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
