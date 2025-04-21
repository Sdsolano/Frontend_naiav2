import React, { useState } from 'react';
import { Download, Info, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const FunctionResultsDisplay = ({ functionResults }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (!functionResults) return null;

  // Handle array of results or single result object
  const resultsArray = Array.isArray(functionResults) ? functionResults : [functionResults];
  
  // If there are no valid results, don't render anything
  if (resultsArray.length === 0) return null;
  
  // Check if there's any content to display
  const hasContent = resultsArray.some(result => 
    result.display || result.pdf || result.resolved_rag
  );
  
  if (!hasContent) return null;

  return (
    <div className={`fixed top-0 right-0 bottom-0 z-20 pointer-events-auto transition-all duration-300 ease-in-out ${isCollapsed ? 'w-5' : 'w-96'}`}>
      {/* Collapse toggle button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 bg-white bg-opacity-50 shadow-md rounded-full flex items-center justify-center z-10"
      >
        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
      
      <div className="h-full flex flex-col m-4 rounded-2xl bg-white bg-opacity-50 backdrop-blur-md shadow-2xl overflow-hidden border border-sky-100">
        <div className="p-4 border-b border-sky-100">
          <h2 className="font-bold text-lg text-gray-800">Información adicional</h2>
        </div>
        
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-4">
            {resultsArray.map((result, index) => {
              // Check which type of result we have
              const isDisplay = result.display;
              const isPdf = result.pdf;
              const isResolvedRag = result.resolved_rag;
              
              // Skip if no valid content
              if (!isDisplay && !isPdf && !isResolvedRag) return null;
              
              return (
                <div key={index} className="mb-4 last:mb-0">
                  {isDisplay && (
                    <div 
                      className="function-result-content prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: isDisplay }} 
                    />
                  )}
                  
                  {isPdf && (
                    <div className="flex flex-col items-center p-4 bg-gray-50 bg-opacity-50 rounded-lg">
                      <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-3">
                        <FileText className="h-8 w-8 text-blue-950" />
                      </div>
                      <p className="mb-3 text-gray-700 text-center">Documento disponible para descargar</p>
                      <button 
                        className="flex items-center px-4 py-2 bg-blue-950 text-white rounded-md hover:bg-gray-900 transition-colors"
                        onClick={() => {
                          try {
                            // Obtener el contenido
                            const content = isPdf;
                            
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
                              doc.save('documento.pdf');
                            }).catch(error => {
                              console.error('Error al cargar jsPDF:', error);
                              alert('No se pudo generar el PDF. Asegúrese de que jsPDF esté instalado.');
                              
                              // Fallback: descargar como texto
                              const blob = new Blob([content], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'documento.txt';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            });
                          } catch (error) {
                            console.error('Error al crear documento:', error);
                            alert('Ocurrió un error al generar el PDF.');
                          }
                        }}
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Descargar Documento
                      </button>
                    </div>
                  )}
                  
                  {isResolvedRag && (
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-950 rounded-r-md flex items-center">
                      <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                      <p className="font-medium">Información obtenida del sistema RAG</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FunctionResultsDisplay;