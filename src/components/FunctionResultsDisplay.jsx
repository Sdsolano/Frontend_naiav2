import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Download, FileText, ChevronLeft, ChevronRight, X, BarChart2, Search } from 'lucide-react';
import { useNotification } from '../components/NotificationContext';

// Component to render graph HTML content in an iframe with universal compatibility
const GraphRenderer = forwardRef(({ htmlContent }, ref) => {
  const iframeRef = useRef(null);
  const contentRef = useRef("");
  
  // Generate a unique key for the iframe whenever content changes
  const [iframeKey, setIframeKey] = useState(1);
  
  // Expose ref methods to parent component
  useImperativeHandle(ref, () => ({
    getIframeRef: () => iframeRef
  }));
  
  useEffect(() => {
    if (!htmlContent) return;
    
    // Save the content for comparison
    if (contentRef.current === htmlContent) {
      // Same content, no need to recreate iframe
      return;
    }
    
    contentRef.current = htmlContent;
    
    // Increment iframe key to force recreation
    setIframeKey(prev => prev + 1);
  }, [htmlContent]);
  
  // Setup message listener for download requests from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Only process messages that include download data
      if (event.data && event.data.type === 'download-image') {
        try {
          // Create a temporary anchor to trigger download
          const a = document.createElement('a');
          a.href = event.data.dataUrl;
          a.download = event.data.filename || 'chart.png';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(event.data.dataUrl);
          }, 100);
        } catch (error) {
          console.error('Error processing download:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  useEffect(() => {
    if (!iframeRef.current) return;
    
    // Only clean the backticks, don't modify the content itself
    let cleanHtml = contentRef.current;
    
    // Remove markdown code block syntax if present
    if (cleanHtml.startsWith('```') && cleanHtml.endsWith('```')) {
      cleanHtml = cleanHtml.substring(cleanHtml.indexOf('\n') + 1, cleanHtml.lastIndexOf('```'));
    }
    
    // Add universal responsive styles AND fix download functionality
    cleanHtml = cleanHtml.replace('<head>', 
      `<head>
      <style id="graph-renderer-universal-fix">
        /* Universal fixes for responsiveness */
        html, body {
          height: auto !important;
          overflow-y: visible !important;
          overflow-x: hidden !important;
          padding: 0 !important;
          margin: 0 !important;
          min-width: 0 !important;
        }
        
        /* Make all containers responsive */
        #container, #chartContainer, .container, .chart-container, div[id*="chart"], div[id*="container"] {
          width: 100% !important;
          max-width: 100% !important;
          position: relative !important;
          box-sizing: border-box !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        
        /* Ensure chart canvas is responsive */
        canvas {
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* Ensure caption and other elements are visible */
        #caption, .caption, div[id*="caption"], div[class*="caption"], 
        div[aria-label*="caption"], div[aria-label*="Caption"] {
          position: relative !important;
          display: block !important;
          max-width: 100% !important;
          margin-top: 15px !important;
          box-sizing: border-box !important;
        }
        
        /* Fix button visibility */
        button, a.button, .btn, [role="button"] {
          display: inline-block !important;
          margin-top: 10px !important;
          margin-bottom: 10px !important;
        }
        
        /* Make container have some breathing room at bottom */
        body {
          padding-bottom: 30px !important;
        }
        
        /* Lists in captions */
        #caption ul, .caption ul, div[id*="caption"] ul {
          padding-left: 25px !important;
          margin-top: 5px !important;
          margin-bottom: 10px !important;
        }
      </style>`);
    
    try {
      // Use srcdoc to set the content directly
      iframeRef.current.srcdoc = cleanHtml;
    } catch (error) {
      console.error('Error setting iframe content:', error);
    }
  }, [iframeKey]);
  
  return (
    <div className="iframe-container w-full" style={{ overflow: 'hidden' }}>
      <iframe 
        key={iframeKey}
        ref={iframeRef}
        className="w-full border-0"
        title="Graph Content"
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{ 
          width: '100%',
          height: '700px',
          border: 'none',
          display: 'block',
          overflow: 'auto'
        }}
      />
    </div>
  );
});

// Función para capturar un iframe como imagen
const captureIframeAsImage = async (iframeRef, filename = 'chart.png') => {
  try {
    // Importar html2canvas dinámicamente
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;
    
    if (!iframeRef || !iframeRef.current) {
      throw new Error('No se pudo acceder al iframe');
    }
    
    // Acceder al documento dentro del iframe
    const iframeDocument = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
    const container = iframeDocument.body;
    
    // Si no hay contenido, salir
    if (!container) {
      throw new Error('No se pudo acceder al contenido del iframe');
    }
    
    // Mostrar retroalimentación visual durante la captura
    const captureOverlay = document.createElement('div');
    captureOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.7);display:flex;justify-content:center;align-items:center;z-index:9999;';
    captureOverlay.innerHTML = '<div style="background:white;padding:20px;border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,0.2);font-family:sans-serif;">Capturando gráfica...</div>';
    document.body.appendChild(captureOverlay);
    
    // Configurar opciones de captura
    const options = {
      backgroundColor: '#FFFFFF',
      scale: 2, // Mayor resolución
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight
    };
    
    // Capturar el contenido
    const canvas = await html2canvas(container, options);
    
    // Convertir a DataURL
    const dataUrl = canvas.toDataURL('image/png');
    
    // Crear un enlace de descarga
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || 'chart.png';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Quitar el overlay
    document.body.removeChild(captureOverlay);
    
    return true;
  } catch (error) {
    console.error('Error al capturar imagen:', error);
    alert('Hubo un problema al capturar la gráfica. Por favor intente nuevamente.');
    return false;
  }
};

const FunctionResultsDisplay = ({ functionResults }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('display');
  const [displayResults, setDisplayResults] = useState([]);
  const [pdfResults, setPdfResults] = useState([]);
  const [graphResults, setGraphResults] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [activeGraphModal, setActiveGraphModal] = useState(null);
  
  // Use refs to track state without triggering re-renders
  const processedResultsRef = useRef(new Set());
  const resultsRef = useRef(null);
  const modalRef = useRef(null);
  const graphRendererRef = useRef(null);
  const lastFunctionResultsRef = useRef(null);
  
  const { addNotification } = useNotification();

  // Process function results without dependency on state that would cause loops
  const processFunctionResults = useCallback((results) => {
    if (!results || results === lastFunctionResultsRef.current) return;
    
    // Save reference to avoid processing the same results multiple times
    lastFunctionResultsRef.current = results;
    
    // Generate a unique batch ID
    const batchId = Date.now().toString();
    
    // Handle array of results or single result
    const resultsArray = Array.isArray(results) ? results : [results];
    
    // Process each result
    let newDisplayResults = [];
    let newPdfResults = [];
    let newGraphResults = [];
    let newSearchResults = [];
    let firstNewGraph = null;
    
    resultsArray.forEach((result, index) => {
      // Create a stable ID for this result
      const resultId = `${batchId}-${index}`;
      
      // Skip if already processed
      if (processedResultsRef.current.has(resultId)) return;
      
      // Mark as processed
      processedResultsRef.current.add(resultId);
      
      // Process RAG notifications
      if (result.resolved_rag) {
        addNotification('Información obtenida del sistema RAG para mejorar la respuesta', 'info');
      }
      
      // Process display content
      if (result.display) {
        newDisplayResults.push({
          id: resultId,
          content: result.display,
          timestamp: new Date().toLocaleTimeString()
        });
      }
      
      // Process PDF content
      if (result.pdf) {
        newPdfResults.push({
          id: resultId,
          content: result.pdf,
          timestamp: new Date().toLocaleTimeString()
        });
      }
      
      // Process graph content
      if (result.graph) {
        const graphResult = {
          id: resultId,
          content: result.graph,
          timestamp: new Date().toLocaleTimeString(),
          title: result.title || `Gráfica ${graphResults.length + newGraphResults.length + 1}`
        };
        
        newGraphResults.push(graphResult);
        
        // Save first new graph to show in modal
        if (!firstNewGraph) {
          firstNewGraph = graphResult;
        }
      }
      
      // Process search results
      if (result.search_results) {
        newSearchResults.push({
          id: resultId,
          content: result.search_results,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    });
    
    // Batch state updates to avoid multiple re-renders
    if (newDisplayResults.length > 0) {
      setDisplayResults(prev => [...prev, ...newDisplayResults]);
      if (pdfResults.length === 0 && graphResults.length === 0 && searchResults.length === 0 &&
          newPdfResults.length === 0 && newGraphResults.length === 0 && newSearchResults.length === 0) {
        setActiveTab('display');
      }
    }
    
    if (newPdfResults.length > 0) {
      setPdfResults(prev => [...prev, ...newPdfResults]);
      if (displayResults.length === 0 && graphResults.length === 0 && searchResults.length === 0 &&
          newDisplayResults.length === 0 && newGraphResults.length === 0 && newSearchResults.length === 0) {
        setActiveTab('pdf');
      }
    }
    
    if (newGraphResults.length > 0) {
      setGraphResults(prev => [...prev, ...newGraphResults]);
      if (displayResults.length === 0 && pdfResults.length === 0 && searchResults.length === 0 &&
          newDisplayResults.length === 0 && newPdfResults.length === 0 && newSearchResults.length === 0) {
        setActiveTab('graphs');
      }
      
      // Show the first graph in modal if this is our first graph
      if (graphResults.length === 0) {
        setActiveGraphModal(firstNewGraph);
      }
    }
    
    // Manejar resultados de búsqueda
    if (newSearchResults.length > 0) {
      setSearchResults(prev => [...prev, ...newSearchResults]);
      if (displayResults.length === 0 && pdfResults.length === 0 && graphResults.length === 0 &&
          newDisplayResults.length === 0 && newPdfResults.length === 0 && newGraphResults.length === 0) {
        setActiveTab('search');
      }
    }
  }, [addNotification, displayResults.length, graphResults.length, pdfResults.length, searchResults.length]);

  // Handle the functionResults prop
  useEffect(() => {
    processFunctionResults(functionResults);
  }, [functionResults, processFunctionResults]);
  
  // Handle click outside modal to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeGraphModal && modalRef.current && !modalRef.current.contains(event.target)) {
        setActiveGraphModal(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeGraphModal]);
  
  // Close modal with escape key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && activeGraphModal) {
        setActiveGraphModal(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [activeGraphModal]);
  
  // Scroll to the last result when a new one is added
  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [displayResults, pdfResults, graphResults, searchResults, activeTab]);
  
  // Don't render anything if there are no results
  const hasAnyResults = displayResults.length > 0 || pdfResults.length > 0 || graphResults.length > 0 || searchResults.length > 0;
  if (!hasAnyResults) return null;

  // Función para descargar la gráfica activa
  const downloadActiveGraph = () => {
    if (!activeGraphModal) return;
    
    // Generar un nombre de archivo único basado en el título y timestamp
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
    const filename = `${activeGraphModal.title.replace(/\s+/g, '_')}_${timestamp}.png`;
    
    // Verificar que tenemos acceso al iframe
    if (graphRendererRef.current && graphRendererRef.current.getIframeRef) {
      const iframeRef = graphRendererRef.current.getIframeRef();
      
      // Capturar el iframe como imagen
      captureIframeAsImage(iframeRef, filename)
        .then(success => {
          if (success) {
            addNotification('Gráfica descargada correctamente', 'success');
          } else {
            addNotification('No se pudo descargar la gráfica', 'error');
          }
        })
        .catch(err => {
          console.error('Error al descargar la gráfica:', err);
          addNotification('Error al descargar la gráfica', 'error');
        });
    } else {
      addNotification('No se pudo acceder a la gráfica para descargar', 'error');
    }
  };

  return (
    <>
      {/* Floating graph modal without affecting the background */}
      {activeGraphModal && (
        <div className="fixed left-0 top-0 bottom-0 z-50 pointer-events-none flex items-center sm:pl-16 md:pl-20">
          <div 
            ref={modalRef}
            className="pointer-events-auto relative bg-white/95 rounded-2xl shadow-lg border border-sky-100 overflow-hidden ml-4"
            style={{ 
              width: 'min(90vw, 600px)', 
              height: 'min(90vh, 600px)',
              aspectRatio: '1 / 1'
            }}
          >
            <div className="flex justify-between items-center p-4 border-b border-sky-100 bg-white/90">
              <h3 className="font-bold text-lg text-gray-800">{activeGraphModal.title}</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Evitar que el clic cierre el modal
                    downloadActiveGraph();
                  }}
                  className="p-2 rounded-md bg-blue-950 text-white hover:bg-blue-900 transition-colors flex items-center"
                  aria-label="Descargar gráfica"
                  title="Descargar gráfica como PNG"
                >
                  <Download className="w-4 h-4" />
                  <span className="ml-1 text-sm font-medium">Descargar</span>
                </button>
                <button 
                  onClick={() => setActiveGraphModal(null)}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-4 h-[calc(100%-65px)]">
              <GraphRenderer 
                ref={graphRendererRef}
                htmlContent={activeGraphModal.content} 
              />
            </div>
          </div>
        </div>
      )}
    
      {/* Main sidebar panel */}
      <div className={`fixed top-0 right-0 bottom-0 z-20 pointer-events-auto transition-all duration-300 ease-in-out ${isCollapsed ? 'w-5' : 'w-96'}`}>
        {/* Collapse/expand button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 bg-white bg-opacity-50 shadow-md rounded-full flex items-center justify-center z-10"
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        
        {!isCollapsed && (
          <div className="h-full flex flex-col m-4 rounded-2xl bg-white bg-opacity-50 backdrop-blur-md shadow-2xl overflow-hidden border border-sky-100">
            {/* Header */}
            <div className="p-4 border-b border-sky-100">
              <h2 className="font-bold text-lg text-gray-800">Información adicional</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-sky-100 flex-wrap">
              {displayResults.length > 0 && (
                <button 
                  className={`flex-1 py-3 px-2 text-sm font-medium ${activeTab === 'display' ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('display')}
                >
                  Bibliografía ({displayResults.length})
                </button>
              )}
              {searchResults.length > 0 && (
                <button 
                  className={`flex-1 py-3 px-2 text-sm font-medium ${activeTab === 'search' ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('search')}
                >
                  Búsquedas ({searchResults.length})
                </button>
              )}
              {pdfResults.length > 0 && (
                <button 
                  className={`flex-1 py-3 px-2 text-sm font-medium ${activeTab === 'pdf' ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('pdf')}
                >
                  Documentos ({pdfResults.length})
                </button>
              )}
              {graphResults.length > 0 && (
                <button 
                  className={`flex-1 py-3 px-2 text-sm font-medium ${activeTab === 'graphs' ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('graphs')}
                >
                  Gráficas ({graphResults.length})
                </button>
              )}
            </div>
            
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4" ref={resultsRef}>
              {/* HTML display tab */}
              {activeTab === 'display' && (
                <div className="space-y-4">
                  {displayResults.map((result) => (
                    <div key={result.id} className="bg-white bg-opacity-70 rounded-lg shadow p-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-gray-500">{result.timestamp}</p>
                      </div>
                      <div 
                        className="function-result-content prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: result.content }} 
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Search results tab */}
              {activeTab === 'search' && (
                <div className="space-y-4">
                  {searchResults.map((result) => (
                    <div key={result.id} className="bg-white bg-opacity-70 rounded-lg shadow p-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <Search className="w-4 h-4 text-blue-500 mr-2" />
                          <p className="text-xs text-gray-500">{result.timestamp}</p>
                        </div>
                      </div>
                      <div 
                        className="function-result-content prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: result.content }} 
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* PDF tab */}
              {activeTab === 'pdf' && (
                <div className="space-y-4">
                  {pdfResults.map((result) => (
                    <div key={result.id} className="flex flex-col items-center p-4 bg-white bg-opacity-70 rounded-lg shadow mb-4">
                      <div className="w-full flex justify-between items-center mb-2">
                        <p className="text-xs text-gray-500">{result.timestamp}</p>
                      </div>
                      <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-3">
                        <FileText className="h-8 w-8 text-blue-950" />
                      </div>
                      <p className="mb-3 text-gray-700 text-center">Documento disponible para descargar</p>
                      <button 
                        className="flex items-center px-4 py-2 bg-blue-950 text-white rounded-md hover:bg-gray-900 transition-colors"
                        onClick={() => {
                          try {
                            // Handle PDF download logic - keeping existing functionality
                            const content = result.content;
                            
                            // Check if it's already a base64 PDF
                            if (typeof content === 'string' && 
                                (content.startsWith('JVBERi0') || content.startsWith('JFBERI'))) {
                              try {
                                // If it's a PDF, just download it
                                const binaryString = window.atob(content);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                  bytes[i] = binaryString.charCodeAt(i);
                                }
                                const blob = new Blob([bytes], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `document_${result.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                return;
                              } catch (e) {
                                console.log('Base64 decode failed, treating as text', e);
                                // Continue with generating PDF from text
                              }
                            }
                            
                            // Convert text content to PDF using jsPDF
                            import('jspdf').then(({ jsPDF }) => {
                              // Create a new PDF document
                              const doc = new jsPDF();
                              const margin = 15;
                              const pageWidth = doc.internal.pageSize.getWidth();
                              const textWidth = pageWidth - (margin * 2);
                              const lines = content.split('\n');
                              let y = margin;
                              
                              lines.forEach(line => {
                                if (line.startsWith('# ')) {
                                  doc.setFontSize(18);
                                  doc.setFont('helvetica', 'bold');
                                  const title = line.substring(2);
                                  const splitTitle = doc.splitTextToSize(title, textWidth);
                                  doc.text(splitTitle, margin, y);
                                  y += 10 * splitTitle.length;
                                } else if (line.startsWith('## ')) {
                                  doc.setFontSize(16);
                                  doc.setFont('helvetica', 'bold');
                                  const subTitle = line.substring(3);
                                  const splitSubTitle = doc.splitTextToSize(subTitle, textWidth);
                                  doc.text(splitSubTitle, margin, y);
                                  y += 8 * splitSubTitle.length;
                                } else if (line.startsWith('### ')) {
                                  doc.setFontSize(14);
                                  doc.setFont('helvetica', 'bold');
                                  const subSubTitle = line.substring(4);
                                  const splitSubSubTitle = doc.splitTextToSize(subSubTitle, textWidth);
                                  doc.text(splitSubSubTitle, margin, y);
                                  y += 8 * splitSubSubTitle.length;
                                } else if (line.trim() === '') {
                                  y += 5;
                                } else {
                                  doc.setFontSize(12);
                                  doc.setFont('helvetica', 'normal');
                                  const splitText = doc.splitTextToSize(line, textWidth);
                                  doc.text(splitText, margin, y);
                                  y += 7 * splitText.length;
                                }
                                
                                if (y > doc.internal.pageSize.getHeight() - margin) {
                                  doc.addPage();
                                  y = margin;
                                }
                              });
                              
                              doc.save(`documento_${result.id}.pdf`);
                            }).catch(error => {
                              console.error('Error loading jsPDF:', error);
                              addNotification('No se pudo generar el PDF. Asegúrese de que jsPDF esté instalado.', 'error');
                              
                              // Fallback: download as text
                              const blob = new Blob([content], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `documento_${result.id}.txt`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            });
                          } catch (error) {
                            console.error('Error creating document:', error);
                            addNotification('Ocurrió un error al generar el PDF.', 'error');
                          }
                        }}
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Descargar Documento
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Graphs tab */}
              {activeTab === 'graphs' && (
                <div className="space-y-4">
                  {graphResults.map((graph) => (
                    <div 
                      key={graph.id} 
                      className="flex flex-col p-4 bg-white bg-opacity-70 rounded-lg shadow mb-4 hover:shadow-md transition-shadow"
                    >
                      <div className="w-full flex justify-between items-center mb-2">
                        <p className="text-xs text-gray-500">{graph.timestamp}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center cursor-pointer" onClick={() => setActiveGraphModal(graph)}>
                          <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                            <BarChart2 className="h-6 w-6 text-blue-950" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{graph.title || 'Gráfica'}</h3>
                            <p className="text-sm text-gray-600">Haz clic para visualizar</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGraphModal(graph);
                            // Usar setTimeout para asegurar que el modal esté listo
                            setTimeout(() => downloadActiveGraph(), 300);
                          }}
                          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center"
                          title="Descargar gráfica"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer with clear button */}
            <div className="p-3 border-t border-sky-100">
              <button 
                onClick={() => {
                  if (activeTab === 'display') {
                    setDisplayResults([]);
                    if (searchResults.length > 0) {
                      setActiveTab('search');
                    } else if (pdfResults.length > 0) {
                      setActiveTab('pdf');
                    } else if (graphResults.length > 0) {
                      setActiveTab('graphs');
                    }
                  } else if (activeTab === 'search') {
                    setSearchResults([]);
                    if (displayResults.length > 0) {
                      setActiveTab('display');
                    } else if (pdfResults.length > 0) {
                      setActiveTab('pdf');
                    } else if (graphResults.length > 0) {
                      setActiveTab('graphs');
                    }
                  } else if (activeTab === 'pdf') {
                    setPdfResults([]);
                    if (displayResults.length > 0) {
                      setActiveTab('display');
                    } else if (searchResults.length > 0) {
                      setActiveTab('search');
                    } else if (graphResults.length > 0) {
                      setActiveTab('graphs');
                    }
                  } else if (activeTab === 'graphs') {
                    setGraphResults([]);
                    setActiveGraphModal(null);
                    if (displayResults.length > 0) {
                      setActiveTab('display');
                    } else if (searchResults.length > 0) {
                      setActiveTab('search');
                    } else if (pdfResults.length > 0) {
                      setActiveTab('pdf');
                    }
                  }
                }}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar {
                  activeTab === 'display' ? 'referencias' : 
                  activeTab === 'pdf' ? 'documentos' : 
                  activeTab === 'search' ? 'búsquedas' : 'gráficas'
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FunctionResultsDisplay;