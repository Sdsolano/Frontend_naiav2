import React, { useState, useEffect, useRef } from 'react';
import { Download, Info, FileText, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { useNotification } from '../components/NotificationContext';

const FunctionResultsDisplay = ({ functionResults }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('display'); // 'display' o 'pdf'
  const [displayResults, setDisplayResults] = useState([]); // Historial de resultados HTML
  const [pdfResults, setPdfResults] = useState([]); // Historial de resultados PDF
  const resultsRef = useRef(null);
  const { addNotification } = useNotification();
  
  // Procesar nuevos resultados cuando lleguen
  useEffect(() => {
    if (!functionResults) return;
    
    // Manejar array de resultados o resultado único
    const resultsArray = Array.isArray(functionResults) ? functionResults : [functionResults];
    
    // Procesar los nuevos resultados
    resultsArray.forEach(result => {
      // Si es resultado RAG, mostrar como notificación
      if (result.resolved_rag) {
        addNotification('Información obtenida del sistema RAG para mejorar la respuesta', 'info');
      }
      
      // Acumular resultados HTML
      if (result.display) {
        setDisplayResults(prev => {
          // Verificar si es un resultado único (no un array)
          const newResult = {
            id: Date.now(), // ID único para identificar cada resultado
            content: result.display,
            timestamp: new Date().toLocaleTimeString()
          };
          return [...prev, newResult];
        });
        
        // Cambiar a la pestaña de display si no hay resultados PDF
        if (pdfResults.length === 0) {
          setActiveTab('display');
        }
      }
      
      // Acumular resultados PDF
      if (result.pdf) {
        setPdfResults(prev => {
          const newResult = {
            id: Date.now(),
            content: result.pdf,
            timestamp: new Date().toLocaleTimeString()
          };
          return [...prev, newResult];
        });
        
        // Cambiar a la pestaña de PDF si no hay resultados display
        if (displayResults.length === 0) {
          setActiveTab('pdf');
        }
      }
    });
  }, [functionResults, addNotification]);
  
  // Hacer scroll al último resultado cuando se añade uno nuevo
  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [displayResults, pdfResults, activeTab]);
  
  // Si no hay ningún resultado, no mostrar el componente
  const hasAnyResults = displayResults.length > 0 || pdfResults.length > 0;
  if (!hasAnyResults) return null;

  return (
    <div className={`fixed top-0 right-0 bottom-0 z-20 pointer-events-auto transition-all duration-300 ease-in-out ${isCollapsed ? 'w-5' : 'w-96'}`}>
      {/* Botón de colapsar/expandir */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 bg-white bg-opacity-50 shadow-md rounded-full flex items-center justify-center z-10"
      >
        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {!isCollapsed && (
        <div className="h-full flex flex-col m-4 rounded-2xl bg-white bg-opacity-50 backdrop-blur-md shadow-2xl overflow-hidden border border-sky-100">
          {/* Encabezado */}
          <div className="p-4 border-b border-sky-100">
            <h2 className="font-bold text-lg text-gray-800">Información adicional</h2>
          </div>
          
          {/* Pestañas */}
          <div className="flex border-b border-sky-100">
            {displayResults.length > 0 && (
              <button 
                className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'display' ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('display')}
              >
                Contenido HTML ({displayResults.length})
              </button>
            )}
            {pdfResults.length > 0 && (
              <button 
                className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'pdf' ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('pdf')}
              >
                Documentos ({pdfResults.length})
              </button>
            )}
          </div>
          
          {/* Contenido de las pestañas */}
          <div className="flex-1 overflow-y-auto p-4" ref={resultsRef}>
            {/* Pestaña de HTML */}
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
            
            {/* Pestaña de PDF */}
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
                          // Obtener el contenido
                          const content = result.content;
                          
                          // Verificar si ya es un PDF en base64
                          if (typeof content === 'string' && 
                              (content.startsWith('JVBERi0') || content.startsWith('JFBERI'))) {
                            try {
                              // Si ya es un PDF, simplemente descargarlo
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
                              // Continuar con generación de PDF desde texto
                            }
                          }
                          
                          // Si llegamos aquí, es contenido de texto/markdown que necesita convertirse a PDF
                          // Importar jsPDF (asumiendo que está instalado)
                          import('jspdf').then(({ jsPDF }) => {
                            // Crear un nuevo documento PDF
                            const doc = new jsPDF();
                            
                            // Definir márgenes y ancho disponible
                            const margin = 15;
                            const pageWidth = doc.internal.pageSize.getWidth();
                            const textWidth = pageWidth - (margin * 2);
                            
                            // Procesar el texto línea por línea para manejar el formato
                            const lines = content.split('\n');
                            let y = margin; // Posición vertical inicial
                            
                            lines.forEach(line => {
                              // Detectar encabezados
                              if (line.startsWith('# ')) {
                                // Encabezado principal
                                doc.setFontSize(18);
                                doc.setFont('helvetica', 'bold');
                                
                                // Dividir el título si es muy largo
                                const title = line.substring(2);
                                const splitTitle = doc.splitTextToSize(title, textWidth);
                                doc.text(splitTitle, margin, y);
                                y += 10 * splitTitle.length;
                              } else if (line.startsWith('## ')) {
                                // Subencabezado
                                doc.setFontSize(16);
                                doc.setFont('helvetica', 'bold');
                                
                                const subTitle = line.substring(3);
                                const splitSubTitle = doc.splitTextToSize(subTitle, textWidth);
                                doc.text(splitSubTitle, margin, y);
                                y += 8 * splitSubTitle.length;
                              } else if (line.startsWith('### ')) {
                                // Sub-subencabezado
                                doc.setFontSize(14);
                                doc.setFont('helvetica', 'bold');
                                
                                const subSubTitle = line.substring(4);
                                const splitSubSubTitle = doc.splitTextToSize(subSubTitle, textWidth);
                                doc.text(splitSubSubTitle, margin, y);
                                y += 8 * splitSubSubTitle.length;
                              } else if (line.trim() === '') {
                                // Línea en blanco
                                y += 5;
                              } else {
                                // Texto normal
                                doc.setFontSize(12);
                                doc.setFont('helvetica', 'normal');
                                
                                // Dividir el texto para que quepa en la página
                                const splitText = doc.splitTextToSize(line, textWidth);
                                doc.text(splitText, margin, y);
                                y += 7 * splitText.length;
                              }
                              
                              // Agregar una nueva página si llegamos al final
                              if (y > doc.internal.pageSize.getHeight() - margin) {
                                doc.addPage();
                                y = margin;
                              }
                            });
                            
                            // Guardar el PDF
                            doc.save(`documento_${result.id}.pdf`);
                          }).catch(error => {
                            console.error('Error al cargar jsPDF:', error);
                            addNotification('No se pudo generar el PDF. Asegúrese de que jsPDF esté instalado.', 'error');
                            
                            // Fallback: descargar como texto
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
                          console.error('Error al crear documento:', error);
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
          </div>
          
          {/* Botón para limpiar historial */}
          <div className="p-3 border-t border-sky-100">
            <button 
              onClick={() => {
                if (activeTab === 'display') {
                  setDisplayResults([]);
                  if (pdfResults.length > 0) {
                    setActiveTab('pdf');
                  }
                } else {
                  setPdfResults([]);
                  if (displayResults.length > 0) {
                    setActiveTab('display');
                  }
                }
              }}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar {activeTab === 'display' ? 'contenido HTML' : 'documentos'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FunctionResultsDisplay;