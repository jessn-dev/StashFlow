/**
 * @module SkeletonLayout
 * Provides a visual placeholder and progress indicator while the AI is 
 * processing a document.
 */

/**
 * Animated loading state for document analysis.
 * 
 * @returns {JSX.Element} The rendered skeleton loading state.
 */
export function SkeletonLayout() {
  /*
   * PSEUDOCODE:
   * 1. Display a card with a clean, modern aesthetic.
   * 2. Use a bouncing emoji as a high-signal indicator of background processing.
   * 3. Provide human-readable text to set expectations for processing time (15-30s).
   * 4. Render a CSS-animated progress bar to signify that the application hasn't frozen.
   */
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-6 py-12 text-center flex flex-col items-center">
        {/* The robot icon reinforces the "AI" nature of the task being performed */}
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl mb-4 animate-bounce">🤖</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Analyzing Document...</h3>
        <p className="text-sm text-gray-400 max-w-xs">Our AI is extracting financial details. This usually takes 15-30 seconds.</p>
        
        {/* Progress bar container */}
        <div className="w-full max-w-xs bg-gray-100 h-1.5 rounded-full mt-8 overflow-hidden">
           {/* Animated bar using a custom linear animation defined in the global CSS */}
           <div className="bg-gray-900 h-full w-1/3 rounded-full animate-[progress_2s_infinite_linear]" />
        </div>
      </div>
    </div>
  );
}
