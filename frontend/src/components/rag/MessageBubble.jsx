import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SourceCard } from "./SourceCard";
import { VoiceOutputPlayer } from "./VoiceOutputPlayer";
import { ragService } from "../../services/ragService";
import { useToast } from "../../hooks/useToast";

// Helper function to remove Markdown formatting for TTS
function stripMarkdown(text) {
  if (!text) return "";

  let cleaned = text;

  // Remove bold formatting (**text** or __text__)
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/__(.+?)__/g, "$1");

  // Remove italic formatting (*text* or _text_)
  cleaned = cleaned.replace(/\*(.+?)\*/g, "$1");
  cleaned = cleaned.replace(/_(.+?)_/g, "$1");

  // Remove headers (# or ## or ### etc.)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // Remove inline code (`code`)
  cleaned = cleaned.replace(/`(.+?)`/g, "$1");

  // Remove code blocks (```code```)
  cleaned = cleaned.replace(/```[a-z]*\n(.+?)\n```/gs, "$1");

  return cleaned.trim();
}

// Helper to fix broken/partial links (specifically LinkedIn as requested)
function processContent(text) {
  if (!text) return "";

  // Fix /linkedin/in/... patterns to be clickable proper links
  // We use a negative lookbehind-ish approach by checking we aren't inside a markdown link structure roughly
  // simplified: just replace specific patterns if they appear as raw words
  return text.replace(/(\/linkedin\/in\/[\w-]+)/g, (match) => {
    // If it's already part of a link (e.g. ](/linkedin...), this simple regex might be aggressive
    // But for the specific user request about "this kind of links" appearing in text, this is the fix.
    const url = `https://www.linkedin.com${match}`;
    return `[${match}](${url})`;
  });
}

export function MessageBubble(props) {
  const { type, content, sources = [], query = "", onRegenerate } = props;
  const [showSources, setShowSources] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { showToast } = useToast();

  // Safety check for content
  if (!content) {
    console.warn("MessageBubble received empty content");
    return null;
  }

  // Clean the content from any Markdown formatting
  const cleanContent = stripMarkdown(content);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(cleanContent);
      setIsCopied(true);
      showToast({ type: "success", message: "Text copied to clipboard!" });

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      showToast({
        type: "error",
        message: "Failed to copy text. Please try again.",
      });
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await ragService.exportToPDF({
        query: query,
        answer: cleanContent,
        sources: sources || [],
      });
      showToast({ type: "success", message: "PDF exported successfully!" });
    } catch (error) {
      showToast({
        type: "error",
        message:
          error.response?.data?.detail ||
          "Failed to export PDF. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (type === "user") {
    return (
      <div className="w-full mb-6 flex justify-end">
        <div className="bg-gray-100/80 rounded-[20px] rounded-tr-sm px-5 py-2.5 max-w-[85%] sm:max-w-[75%]">
          <p className="text-gray-900 text-[15px] leading-relaxed break-words">
            {content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-10 group">
      <div className="flex gap-4 w-full">


        <div className="flex-1 min-w-0">
          {/* Render markdown content with custom styling */}
          <div className="prose max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-900 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-orange-600 prose-code:bg-orange-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-ul:text-gray-900 prose-ol:text-gray-900 prose-li:text-gray-900">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="!text-blue-600 !underline hover:!text-blue-800 break-all !cursor-pointer font-medium relative z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-gray-200">
                    <table {...props} className="min-w-full divide-y divide-gray-200" />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead {...props} className="bg-gray-50" />
                ),
                tbody: ({ node, ...props }) => (
                  <tbody {...props} className="divide-y divide-gray-200 bg-white" />
                ),
                tr: ({ node, ...props }) => (
                  <tr {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th {...props} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" />
                ),
                td: ({ node, ...props }) => (
                  <td {...props} className="px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap" />
                )
              }}
            >
              {processContent(content)}
            </ReactMarkdown>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Copy Button */}
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                title="Copy text"
              >
                {isCopied ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Sources Button */}
              {sources && sources.length > 0 && (
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {sources.length} source{sources.length > 1 ? "s" : ""}
                  <svg
                    className={`w-3 h-3 transition-transform ${showSources ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              )}


              {/* Regenerate Button - Only shown if onRegenerate prop is provided */}
              {props.onRegenerate && (
                <button
                  onClick={props.onRegenerate}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-600 transition-colors"
                  title="Regenerate response"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerate</span>
                </button>
              )}

              {/* Export PDF Button */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to PDF"
              >
                {isExporting ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Export PDF</span>
                  </>
                )}
              </button>

              {/* Voice Output Player - Read aloud */}
              <VoiceOutputPlayer
                text={cleanContent}
                className="ml-1"
              />
            </div>
          </div>
          {showSources && sources && sources.length > 0 && (
            <div className="space-y-2 mt-4 pt-2 border-t border-gray-100/50">
              {sources.map((source, index) => (
                <SourceCard key={source.id || index} {...source} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
