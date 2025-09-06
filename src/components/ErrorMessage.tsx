import React from 'react';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => {
  return (
    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg">
      <p className="text-sm">{error}</p>
      {error.includes('ad blocker') && (
        <div className="mt-2 text-sm">
          <p>To fix this:</p>
          <ol className="list-decimal ml-4 mt-1">
            <li>Disable your ad blocker for this site</li>
            <li>Refresh the page</li>
            <li>Try your action again</li>
          </ol>
        </div>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-orange-500 hover:text-orange-400"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage; 