import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Download, FileText, ChevronLeft, ChevronRight, X, BarChart2, Search } from 'lucide-react';
import { useNotification } from '../components/NotificationContext';

const GraphRenderer = forwardRef(({ htmlContent }, ref) => {
  const iframeRef = useRef(null);
  const contentRef = useRef("");
  const blobUrlRef = useRef(null); // 🚨 SOLO ESTO ES NUEVO
  
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
    
    // 🚨 NUEVO: Limpiar blob URL anterior
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    
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
      // 🚨 CAMBIO PRINCIPAL: Usar blob URL en lugar de srcdoc
      const blob = new Blob([cleanHtml], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      
      // Cambiar de srcdoc a src con blob URL
      iframeRef.current.src = blobUrl;
    } catch (error) {
      console.error('Error setting iframe content:', error);
      // Fallback a srcdoc si blob falla
      iframeRef.current.srcdoc = cleanHtml;
    }
  }, [iframeKey]);
  
  // 🚨 NUEVO: Cleanup del blob URL
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);
  
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
          title: result.title || `Imagen ${graphResults.length + newGraphResults.length + 1}`
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
    if (firstNewGraph) {
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
            addNotification('Imagen descargada correctamente', 'success');
          } else {
            addNotification('No se pudo descargar la imagen', 'error');
          }
        })
        .catch(err => {
          console.error('Error al descargar la imagen:', err);
          addNotification('Error al descargar la imagen', 'error');
        });
    } else {
      addNotification('No se pudo acceder a la imagen para descargar', 'error');
    }
  };

// Función para detectar si el contenido es HTML
function detectHTMLContent(content) {
  // Normalizar el contenido
  const trimmedContent = content.trim();
  
  // Verificar si tiene estructura HTML básica
  const hasHTMLStructure = (
    trimmedContent.includes('<!DOCTYPE') ||
    trimmedContent.includes('<html') ||
    trimmedContent.includes('<head>') ||
    trimmedContent.includes('<body>') ||
    (trimmedContent.startsWith('<') && trimmedContent.endsWith('>'))
  );
  
  // Verificar si tiene tags HTML comunes
  const hasHTMLTags = /<\/?[a-z][\s\S]*>/i.test(trimmedContent);
  
  // Verificar si tiene atributos de estilo CSS
  const hasCSS = (
    trimmedContent.includes('style=') ||
    trimmedContent.includes('<style>') ||
    trimmedContent.includes('class=') ||
    trimmedContent.includes('id=')
  );
  
  // Verificar que NO sea markdown (sin headers markdown, sin syntax markdown)
  const hasMarkdownSyntax = (
    trimmedContent.includes('# ') ||
    trimmedContent.includes('## ') ||
    trimmedContent.includes('### ') ||
    trimmedContent.includes('**') ||
    trimmedContent.includes('*') && !trimmedContent.includes('<')
  );
  
  // Es HTML si:
  // 1. Tiene estructura o tags HTML Y
  // 2. (Tiene CSS O no tiene sintaxis clara de markdown)
  return hasHTMLTags && (hasCSS || !hasMarkdownSyntax);
}

// Función para convertir HTML a PDF como texto real (no imagen)
function downloadAsHTML(content, resultId) {
  try {
    // Limpiar el contenido de markdown code blocks si los tiene
    let cleanHTML = content;
    if (cleanHTML.startsWith('```') && cleanHTML.endsWith('```')) {
      cleanHTML = cleanHTML.substring(cleanHTML.indexOf('\n') + 1, cleanHTML.lastIndexOf('```'));
    }
    
    // Convertir HTML a PDF con texto real
    convertHTMLToTextPDF(cleanHTML, resultId);
    
  } catch (error) {
    console.error('Error processing HTML:', error);
    addNotification('Error al procesar el documento HTML', 'error');
    
    // Fallback: usar la función de markdown PDF
    downloadAsMarkdownPDF(content, resultId);
  }
}

// Función para convertir HTML a PDF conservando todos los estilos (como imagen)
function downloadAsHTML(content, resultId) {
  try {
    // Limpiar el contenido de markdown code blocks si los tiene
    let cleanHTML = content;
    if (cleanHTML.startsWith('```') && cleanHTML.endsWith('```')) {
      cleanHTML = cleanHTML.substring(cleanHTML.indexOf('\n') + 1, cleanHTML.lastIndexOf('```'));
    }
    
    // Convertir HTML a PDF conservando absolutamente todos los estilos
    convertHTMLToVisualPDF(cleanHTML, resultId);
    
  } catch (error) {
    console.error('Error processing HTML:', error);
    addNotification('Error al procesar el documento HTML', 'error');
    
    // Fallback: usar la función de markdown PDF
    downloadAsMarkdownPDF(content, resultId);
  }
}

// Función mejorada para convertir HTML a PDF visual conservando todos los estilos
async function convertHTMLToVisualPDF(htmlContent, resultId) {
  try {
    // Cargar las bibliotecas necesarias
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);
    
    const html2canvas = html2canvasModule.default;
    const { jsPDF } = jsPDFModule;
    
    addNotification('Generando PDF conservando todos los estilos...', 'info');
    
    // Preparar el HTML completo con todos los estilos
    let fullHTML = htmlContent;
    
    // Si no es un documento HTML completo, envolverlo
    if (!fullHTML.includes('<!DOCTYPE') && !fullHTML.includes('<html')) {
      fullHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documento HTML</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            padding-bottom: 50px; /* Solo un poco de padding extra */
            background: white;
            box-sizing: border-box;
        }
        * { 
            box-sizing: border-box; 
        }
        img { 
            max-width: 100%; 
            height: auto; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0;
        }
        th, td { 
            padding: 8px; 
            border: 1px solid #ddd; 
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        /* Asegurar que los elementos no se corten */
        div, p, h1, h2, h3, h4, h5, h6, ul, ol, li {
            page-break-inside: avoid;
            break-inside: avoid;
        }
    </style>
</head>
<body>
    ${fullHTML}
</body>
</html>`;
    }
    
    // Crear un iframe invisible para renderizar el HTML correctamente
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-10000px';
    iframe.style.top = '-10000px';
    iframe.style.width = '1024px'; // Ancho estándar para PDF
    iframe.style.height = '1400px'; // Alto inicial
    iframe.style.border = 'none';
    iframe.style.backgroundColor = 'white';
    
    document.body.appendChild(iframe);
    
    // Escribir el HTML en el iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(fullHTML);
    iframe.contentDocument.close();
    
    // Esperar a que todo se cargue completamente
    await new Promise(resolve => {
      iframe.onload = resolve;
      // Fallback timeout
      setTimeout(resolve, 2000);
    });
    
    // Ajustar altura del iframe al contenido con un pequeño buffer
    const iframeDoc = iframe.contentDocument;
    const body = iframeDoc.body;
    const html = iframeDoc.documentElement;
    
    const actualHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    ) + 50; // Solo 50px de buffer extra para las últimas líneas
    
    iframe.style.height = actualHeight + 'px';
    
    // Esperar un poco más para asegurar el renderizado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Configurar opciones para html2canvas (versión simplificada que funcionaba)
    const options = {
      backgroundColor: '#ffffff',
      scale: 2, // Alta resolución
      useCORS: true,
      allowTaint: true,
      letterRendering: true,
      logging: false, // Desactivar logs molestos
      windowWidth: 1024,
      windowHeight: actualHeight,
      scrollX: 0,
      scrollY: 0,
      width: 1024,
      height: actualHeight,
      ignoreElements: (element) => {
        // Ignorar elementos que puedan causar problemas
        return element.tagName === 'SCRIPT' || element.tagName === 'NOSCRIPT';
      }
    };
    
    // Capturar el contenido del iframe
    const canvas = await html2canvas(body, options);
    
    // Crear el PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    
    // Calcular dimensiones para ajustar al A4
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calcular la altura proporcional de la imagen
    const imgWidth = pdfWidth - 20; // 10mm de margen a cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let yPosition = 10; // Margen superior
    let remainingHeight = imgHeight;
    
    // Si la imagen cabe en una página
    if (imgHeight <= pdfHeight - 20) {
      pdf.addImage(imgData, 'JPEG', 10, yPosition, imgWidth, imgHeight);
    } else {
      // Dividir en múltiples páginas
      const pageContentHeight = pdfHeight - 20; // Altura disponible por página
      let sourceY = 0;
      
      while (remainingHeight > 0) {
        const currentPageHeight = Math.min(remainingHeight, pageContentHeight);
        
        // Crear canvas temporal para esta porción
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = canvas.width;
        tempCanvas.height = (currentPageHeight * canvas.width) / imgWidth;
        
        tempCtx.drawImage(
          canvas,
          0, (sourceY * canvas.width) / imgWidth,
          canvas.width, tempCanvas.height,
          0, 0,
          canvas.width, tempCanvas.height
        );
        
        const tempImgData = tempCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(tempImgData, 'JPEG', 10, 10, imgWidth, currentPageHeight);
        
        remainingHeight -= currentPageHeight;
        sourceY += currentPageHeight;
        
        if (remainingHeight > 0) {
          pdf.addPage();
        }
      }
    }
    
    // Guardar el PDF
    pdf.save(`documento_${resultId}.pdf`);
    
    // Limpiar
    document.body.removeChild(iframe);
    
    addNotification('PDF visual generado correctamente con todos los estilos', 'success');
    
  } catch (error) {
    console.error('Error converting HTML to visual PDF:', error);
    addNotification('Error al generar PDF visual. Usando método alternativo...', 'warning');
    
    // Fallback mejorado
    await fallbackSimpleVisualPDF(htmlContent, resultId);
  }
}

// Fallback simplificado para casos donde el método principal falla
async function fallbackSimpleVisualPDF(htmlContent, resultId) {
  try {
    // Cargar las bibliotecas necesarias
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);
    
    const html2canvas = html2canvasModule.default;
    const { jsPDF } = jsPDFModule;
    
    // Crear elemento temporal
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    element.style.width = '800px';
    element.style.backgroundColor = 'white';
    element.style.padding = '20px';
    element.style.paddingBottom = '50px'; // Un poco de padding extra
    document.body.appendChild(element);
    
    // Esperar a que se rendericen las imágenes y estilos
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Capturar como imagen
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Crear PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF();
    
    // Calcular dimensiones
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    // Añadir primera página
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Añadir páginas adicionales si es necesario
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Descargar
    pdf.save(`documento_${resultId}.pdf`);
    
    // Limpiar
    document.body.removeChild(element);
    
    addNotification('PDF generado con método alternativo', 'success');
    
  } catch (error) {
    console.error('Fallback also failed:', error);
    // Último recurso: usar método de texto
    addNotification('Generando PDF como texto plano debido a errores técnicos...', 'warning');
    downloadAsMarkdownPDF(htmlContent, resultId);
  }
}

// Función para descargar como PDF (lógica existente de markdown)
function downloadAsMarkdownPDF(content, resultId) {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const textWidth = pageWidth - (margin * 2);
    let y = margin;
    
    // Helper function to check if we need a new page
    function checkNewPage(lineHeight) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }
    
    // Helper function to parse and render text with formatting
    function renderFormattedText(text, x, fontSize = 12, isBold = false, isItalic = false) {
      const parts = [];
      let currentText = text;
      
      // Parse bold text (**text** or __text__)
      currentText = currentText.replace(/\*\*(.*?)\*\*/g, (match, content) => {
        parts.push({ text: content, bold: true });
        return `{{BOLD_${parts.length - 1}}}`;
      });
      
      currentText = currentText.replace(/__(.*?)__/g, (match, content) => {
        parts.push({ text: content, bold: true });
        return `{{BOLD_${parts.length - 1}}}`;
      });
      
      // Parse italic text (*text* or _text_)
      currentText = currentText.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (match, content) => {
        parts.push({ text: content, italic: true });
        return `{{ITALIC_${parts.length - 1}}}`;
      });
      
      currentText = currentText.replace(/(?<!_)_([^_]+)_(?!_)/g, (match, content) => {
        parts.push({ text: content, italic: true });
        return `{{ITALIC_${parts.length - 1}}}`;
      });
      
      // Parse links [text](url)
      currentText = currentText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
        parts.push({ text: linkText, link: url });
        return `{{LINK_${parts.length - 1}}}`;
      });
      
      // Parse inline code `code`
      currentText = currentText.replace(/`([^`]+)`/g, (match, code) => {
        parts.push({ text: code, code: true });
        return `{{CODE_${parts.length - 1}}}`;
      });
      
      // Split text by placeholders and render each part
      const segments = currentText.split(/({{[A-Z_0-9]+}})/);
      let currentX = x;
      const lineHeight = fontSize * 0.3;
      
      segments.forEach(segment => {
        if (segment.startsWith('{{') && segment.endsWith('}}')) {
          // Extract the part information
          const partIndex = parseInt(segment.match(/\d+/)[0]);
          const part = parts[partIndex];
          
          if (part.bold) {
            doc.setFont('helvetica', 'bold');
          } else if (part.italic) {
            doc.setFont('helvetica', 'italic');
          } else if (part.link) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 255); // Blue for links
          } else if (part.code) {
            doc.setFont('courier', 'normal');
            doc.setTextColor(100, 100, 100); // Gray for code
          }
          
          doc.setFontSize(fontSize);
          const textWidth = doc.getTextWidth(part.text);
          doc.text(part.text, currentX, y);
          currentX += textWidth + 1;
          
          // Reset formatting
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        } else if (segment.trim()) {
          // Regular text
          doc.setFont('helvetica', isBold ? 'bold' : 'normal');
          doc.setFontSize(fontSize);
          const textWidth = doc.getTextWidth(segment);
          doc.text(segment, currentX, y);
          currentX += textWidth;
        }
      });
      
      return lineHeight;
    }
    
    // Process content line by line
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines but add small spacing
      if (trimmedLine === '') {
        y += 4;
        return;
      }
      
      // Headers
      if (trimmedLine.startsWith('# ')) {
        checkNewPage(25);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(51, 51, 51);
        const title = trimmedLine.substring(2);
        const splitTitle = doc.splitTextToSize(title, textWidth);
        splitTitle.forEach(titleLine => {
          doc.text(titleLine, margin, y);
          y += 12;
        });
        y += 8;
        
        // Add underline for main title
        doc.setLineWidth(0.5);
        doc.line(margin, y - 3, margin + textWidth, y - 3);
        y += 5;
        
      } else if (trimmedLine.startsWith('## ')) {
        checkNewPage(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(68, 68, 68);
        const subTitle = trimmedLine.substring(3);
        const splitSubTitle = doc.splitTextToSize(subTitle, textWidth);
        splitSubTitle.forEach(subTitleLine => {
          doc.text(subTitleLine, margin, y);
          y += 10;
        });
        y += 5;
        
      } else if (trimmedLine.startsWith('### ')) {
        checkNewPage(18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(85, 85, 85);
        const subSubTitle = trimmedLine.substring(4);
        const splitSubSubTitle = doc.splitTextToSize(subSubTitle, textWidth);
        splitSubSubTitle.forEach(subSubTitleLine => {
          doc.text(subSubTitleLine, margin, y);
          y += 9;
        });
        y += 4;
        
      } else if (trimmedLine.startsWith('---')) {
        // Horizontal line
        checkNewPage(10);
        y += 5;
        doc.setLineWidth(0.3);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, margin + textWidth, y);
        y += 8;
        
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Bullet points
        checkNewPage(15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        const bulletText = trimmedLine.substring(2);
        const indent = 25;
        
        // Draw bullet
        doc.circle(margin + 8, y - 2, 1, 'F');
        
        // Split long bullet text
        const splitBulletText = doc.splitTextToSize(bulletText, textWidth - indent);
        splitBulletText.forEach((bulletLine, bulletIndex) => {
          if (bulletIndex === 0) {
            renderFormattedText(bulletLine, margin + indent, 12);
          } else {
            checkNewPage(8);
            renderFormattedText(bulletLine, margin + indent, 12);
          }
          y += 8;
        });
        y += 2;
        
      } else if (trimmedLine.startsWith('> ')) {
        // Blockquotes
        checkNewPage(15);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        
        const quoteText = trimmedLine.substring(2);
        const quoteIndent = 15;
        
        // Draw quote line
        doc.setLineWidth(2);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + 5, y - 5, margin + 5, y + 5);
        
        const splitQuoteText = doc.splitTextToSize(quoteText, textWidth - quoteIndent);
        splitQuoteText.forEach(quoteLine => {
          doc.text(quoteLine, margin + quoteIndent, y);
          y += 7;
        });
        y += 5;
        
      } else if (trimmedLine.startsWith('```')) {
        // Code blocks
        if (trimmedLine === '```') {
          // End of code block, skip
          return;
        }
        
        // Find the end of code block
        const codeLines = [];
        for (let i = index + 1; i < lines.length; i++) {
          if (lines[i].trim() === '```') {
            break;
          }
          codeLines.push(lines[i]);
        }
        
        if (codeLines.length > 0) {
          checkNewPage(codeLines.length * 8 + 10);
          
          // Draw code block background
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, y - 5, textWidth, codeLines.length * 8 + 10, 'F');
          
          doc.setFont('courier', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          
          codeLines.forEach(codeLine => {
            doc.text(codeLine, margin + 5, y);
            y += 8;
          });
          y += 5;
        }
        
      } else {
        // Regular paragraph text
        checkNewPage(15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        const splitText = doc.splitTextToSize(trimmedLine, textWidth);
        splitText.forEach(textLine => {
          checkNewPage(8);
          renderFormattedText(textLine, margin, 12);
          y += 8;
        });
        y += 3;
      }
      
      // Reset colors and fonts
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    });
    
    // Save the PDF
    doc.save(`Document_${resultId}.pdf`);
    addNotification('Document PDF generado y descargado correctamente', 'success');
    
  }).catch(error => {
    console.error('Error loading jsPDF:', error);
    addNotification('No se pudo generar el PDF. Asegúrese de que jsPDF esté instalado.', 'error');
    
    // Fallback: download as text
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Document_${resultId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

  return (
    <>
      {/* Floating graph modal without affecting the background */}
      {activeGraphModal && (
        <div className="fixed left-0 top-0 bottom-0 z-50 pointer-events-none flex items-center pl-2 sm:pl-16 md:pl-20 lg:pl-24">
          <div 
            ref={modalRef}
            className="pointer-events-auto relative bg-white/95 rounded-2xl shadow-lg border border-sky-100 overflow-hidden ml-2 sm:ml-4 w-[85vw] h-[85vh] sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px]"
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
                  aria-label="Descargar imagen"
                  title="Descargar imagen como PNG"
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
      <div className={`fixed top-0 right-0 bottom-0 z-20 pointer-events-auto transition-all duration-300 ease-in-out ${isCollapsed ? 'w-5' : 'w-[85vw] sm:w-80 md:w-96 lg:w-[32rem]'}`}>
        {/* Collapse/expand button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 bg-white bg-opacity-50 shadow-md rounded-full flex items-center justify-center z-10  sm:flex"
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        
        {!isCollapsed && (
          <div className="h-full flex flex-col m-4 rounded-2xl bg-white bg-opacity-50 backdrop-blur-md shadow-2xl overflow-hidden border border-sky-100">
            {/* Header */}
            <div className="p-4 border-b border-sky-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-800">Información adicional</h2>
              {/* Close button for mobile */}
              <button 
                onClick={() => setIsCollapsed(true)}
                className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-700 transition-colors"
                aria-label="Cerrar panel"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-sky-100 flex-wrap">
              {displayResults.length > 0 && (
                <button 
                  className={`flex-1 py-3 px-2 text-sm font-medium ${activeTab === 'display' ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('display')}
                >
                  Resultados ({displayResults.length})
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
                  Imágenes ({graphResults.length})
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
                                // Continue with content detection
                              }
                            }
                            
                            // NUEVA FUNCIONALIDAD: Detectar si el contenido es HTML
                            const isHTML = detectHTMLContent(content);
                            
                            if (isHTML) {
                              // Descargar como HTML conservando estilos
                              downloadAsHTML(content, result.id);
                            } else {
                              // Continuar con la lógica actual para markdown → PDF
                              downloadAsMarkdownPDF(content, result.id);
                            }
                            
                          } catch (error) {
                            console.error('Error creating document:', error);
                            addNotification('Ocurrió un error al generar el documento.', 'error');
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
                            <h3 className="font-medium text-gray-800">{graph.title || 'Imagen'}</h3>
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
                          title="Descargar imagen"
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
                  activeTab === 'display' ? 'resultados' : 
                  activeTab === 'pdf' ? 'documentos' : 
                  activeTab === 'search' ? 'búsquedas' : 'imágenes'
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