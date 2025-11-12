import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X, Copy, Check } from 'lucide-react';

const McpErrorDisplay = ({ mcpErrors, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedErrors, setExpandedErrors] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const errorsRef = useRef(null);

  // Auto-scroll to the latest error
  useEffect(() => {
    if (errorsRef.current && mcpErrors.length > 0) {
      errorsRef.current.scrollTop = errorsRef.current.scrollHeight;
    }
  }, [mcpErrors]);

  // Don't render if no errors
  if (!mcpErrors || mcpErrors.length === 0) return null;

  const toggleErrorExpansion = (errorId) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text, errorId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(errorId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const formatErrorDetails = (error) => {
    return `=== ERROR MCP ===
Tipo: ${error.type}
Timestamp: ${error.timestamp}
Mensaje: ${error.message}
Tipo de Error: ${error.errorType}
Código: ${error.errorCode}
Servidor: ${error.serverLabel}
Item ID: ${error.itemId || 'N/A'}
Event ID: ${error.eventId || 'N/A'}

Datos completos:
${JSON.stringify(error.rawData, null, 2)}`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[90vw] sm:w-96 max-h-[60vh] bg-red-50 border-2 border-red-300 rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex justify-between items-center p-3 bg-red-100 border-b border-red-300 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-red-800">
            Errores MCP ({mcpErrors.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {onClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 rounded-md hover:bg-red-200 transition-colors"
              title="Limpiar errores"
            >
              <X className="w-4 h-4 text-red-700" />
            </button>
          )}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-red-700" />
          ) : (
            <ChevronUp className="w-5 h-5 text-red-700" />
          )}
        </div>
      </div>

      {/* Error list */}
      {isExpanded && (
        <div
          ref={errorsRef}
          className="overflow-y-auto max-h-[50vh] p-3 space-y-2"
        >
          {mcpErrors.map((error, index) => {
            const errorId = `${error.eventId || error.itemId || index}`;
            const isExpanded = expandedErrors.has(errorId);
            const isCopied = copiedId === errorId;

            return (
              <div
                key={errorId}
                className="bg-white rounded-lg border border-red-200 overflow-hidden"
              >
                {/* Error summary */}
                <div
                  className="p-3 cursor-pointer hover:bg-red-50 transition-colors"
                  onClick={() => toggleErrorExpansion(errorId)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 text-sm">
                        {error.type}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {error.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(error.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-red-700 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-red-700 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>

                {/* Error details */}
                {isExpanded && (
                  <div className="px-3 pb-3 bg-gray-50 border-t border-red-200">
                    <div className="space-y-2 text-xs">
                      <div className="mt-2">
                        <span className="font-semibold text-gray-700">Tipo de Error:</span>
                        <span className="ml-2 text-gray-600">{error.errorType}</span>
                      </div>

                      <div>
                        <span className="font-semibold text-gray-700">Código:</span>
                        <span className="ml-2 text-gray-600">{error.errorCode}</span>
                      </div>

                      <div>
                        <span className="font-semibold text-gray-700">Servidor MCP:</span>
                        <span className="ml-2 text-gray-600">{error.serverLabel}</span>
                      </div>

                      {error.itemId && (
                        <div>
                          <span className="font-semibold text-gray-700">Item ID:</span>
                          <span className="ml-2 text-gray-600 font-mono text-xs break-all">
                            {error.itemId}
                          </span>
                        </div>
                      )}

                      {error.eventId && (
                        <div>
                          <span className="font-semibold text-gray-700">Event ID:</span>
                          <span className="ml-2 text-gray-600 font-mono text-xs break-all">
                            {error.eventId}
                          </span>
                        </div>
                      )}

                      {error.details && (
                        <div className="mt-2">
                          <span className="font-semibold text-gray-700">Detalles:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                            {JSON.stringify(error.details, null, 2)}
                          </pre>
                        </div>
                      )}

                      {error.fullError && (
                        <div className="mt-2">
                          <span className="font-semibold text-gray-700">Error Completo:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto max-h-40">
                            {JSON.stringify(error.fullError, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Copy button */}
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(formatErrorDetails(error), errorId);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar detalles</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      {isExpanded && (
        <div className="p-2 bg-red-100 border-t border-red-300 text-xs text-red-700">
          <p>
            💡 Revisa la consola del navegador para más detalles técnicos.
          </p>
        </div>
      )}
    </div>
  );
};

export default McpErrorDisplay;
