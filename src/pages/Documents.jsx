import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Upload, 
  X, 
  AlertCircle, 
  Check, 
  Trash2, 
  UploadCloud, 
  Save,
  Loader,
  Info,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useNotification } from "../components/NotificationContext";
import { BACKEND_URL } from "../../config";
import { useUser } from '../components/UserContext';

// URL base para las API del investigador - IMPORTANTE: debe terminar con barra diagonal (/)
const API_BASE_URL = `${BACKEND_URL}/api/v1/researcher/document/`;

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingDeletions, setPendingDeletions] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [apiError, setApiError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(true);
  const { userId, isUserReady } = useUser();
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);
  const { addNotification } = useNotification();

  // Cargar documentos cuando el componente se monta - SIMPLIFICADO
  useEffect(() => {
    const loadDocuments = async () => {
      if (!isUserReady()) {
        console.log("⚠️ Usuario no está listo, esperando configuración...");
        setIsLoading(false);
        return;
      }

      if (!userId) {
        console.log("⚠️ userId no disponible");
        setApiError("Usuario no identificado");
        setIsLoading(false);
        return;
      }

      console.log("📋 Cargando documentos para usuario:", userId);
      await fetchDocuments();
    };
    
    loadDocuments();
  }, [userId, isUserReady]); // Solo depende de userId e isUserReady

  // Función simplificada para obtener documentos
  const fetchDocuments = async () => {
    if (!userId) {
      throw new Error('Usuario no identificado');
    }
    
    setIsLoading(true);
    setApiError(null);
    
    try {
      // Simple llamada GET para obtener documentos
      const url = `${API_BASE_URL}?user_id=${userId}`;
      console.log(`📥 Obteniendo documentos: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log('✅ Respuesta recibida del servidor');
      
      try {
        const data = JSON.parse(responseText);
        console.log('📊 Documentos encontrados:', data.documents?.length || 0);
        
        setDocuments(data.documents || []);
        setApiAvailable(true);
      } catch (jsonError) {
        console.error('❌ Error parseando JSON:', jsonError);
        throw new Error('Respuesta del servidor no es JSON válido');
      }
    } catch (error) {
      console.error('❌ Error obteniendo documentos:', error);
      setApiError(error.message);
      setApiAvailable(false);
      addNotification(`Error al cargar documentos: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Función simplificada para refrescar
  const refreshDocuments = async () => {
    console.log("🔄 Refrescando lista de documentos...");
    await fetchDocuments();
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dropAreaRef.current && !dropAreaRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    const validFiles = [];
    const maxSize = 1024 * 1024 * 1024; // 1GB
    let invalidFound = false;
    
    // Validación de archivos
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        addNotification(`"${file.name}" no es un archivo PDF`, 'warning');
        invalidFound = true;
        continue;
      }
      
      if (file.size > maxSize) {
        addNotification(`"${file.name}" excede el tamaño máximo de 1GB`, 'warning');
        invalidFound = true;
        continue;
      }
      
      validFiles.push({
        file,
        id: `temp-${Date.now()}-${validFiles.length}`,
        name: file.name,
        size: file.size,
        status: 'pending'
      });
    }
    
    // Verificar límite de 5 archivos
    const remainingDocs = documents.filter(doc => !pendingDeletions.includes(doc.file_id));
    if (remainingDocs.length + pendingFiles.length + validFiles.length > 5) {
      const availableSlots = 5 - (remainingDocs.length + pendingFiles.length);
      
      if (availableSlots <= 0) {
        addNotification('Has alcanzado el límite de 5 documentos', 'warning');
      } else {
        addNotification(`Solo se pueden añadir ${availableSlots} documento(s) más`, 'warning');
        setPendingFiles([...pendingFiles, ...validFiles.slice(0, availableSlots)]);
      }
    } else {
      setPendingFiles([...pendingFiles, ...validFiles]);
      if (validFiles.length > 0 && !invalidFound) {
        addNotification(`${validFiles.length} documento(s) añadido(s) a la cola`, 'success');
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
    
    // Limpiar input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (fileId) => {
    setPendingFiles(pendingFiles.filter(file => file.id !== fileId));
    addNotification('Documento removido de la cola', 'info');
  };

  const markForDeletion = (fileId) => {
    setPendingDeletions([...pendingDeletions, fileId]);
    addNotification('Documento marcado para eliminación', 'warning');
  };

  const undoMarkForDeletion = (fileId) => {
    setPendingDeletions(pendingDeletions.filter(id => id !== fileId));
    addNotification('Documento restaurado', 'info');
  };

  const saveChanges = async () => {
    if (!userId) {
      addNotification("Error: Usuario no identificado", "error");
      return;
    }

    if (!pendingFiles.length && !pendingDeletions.length) {
      addNotification('No hay cambios para guardar', 'info');
      return;
    }

    setIsSaving(true);
    let success = true;
    let hasChanged = false;
    
    try {
      // Manejar eliminaciones
      for (const docId of pendingDeletions) {
        const docToDelete = documents.find(doc => doc.file_id === docId);
        if (!docToDelete) continue;
        
        const deleteUrl = `${API_BASE_URL}?file_id=${encodeURIComponent(docToDelete.file_id)}&file_name=${encodeURIComponent(docToDelete.file_name)}&user_id=${userId}`;
        
        console.log(`🗑️ Eliminando documento: ${docToDelete.file_name}`);
        
        try {
          const response = await fetch(deleteUrl, {
            method: 'DELETE',
          });
          
          if (response.ok) {
            console.log(`✅ Documento eliminado exitosamente: ${docToDelete.file_name}`);
            hasChanged = true;
          } else {
            const errorText = await response.text().catch(() => 'Error desconocido');
            
            // Si el error es 404, asumimos que ya estaba eliminado
            if (response.status === 404 || errorText.includes('not present')) {
              console.log('📝 El documento ya no existe en el servidor, continuando...');
              hasChanged = true;
            } else {
              success = false;
              throw new Error(`Error al eliminar documento ${docToDelete.file_name}: ${errorText}`);
            }
          }
        } catch (error) {
          console.error('❌ Error al eliminar:', error);
          addNotification(`Error: ${error.message}`, 'error');
        }
      }
      
      // Manejar nuevos archivos
      const uploadPromises = pendingFiles.map(async (pendingFile) => {
        try {
          const formData = new FormData();
          formData.append('user_id', userId);
          formData.append('document', pendingFile.file);
          
          // Usar XMLHttpRequest para monitorear el progreso
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                setUploadProgress(prev => ({
                  ...prev,
                  [pendingFile.id]: percentComplete
                }));
              }
            };
            
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log(`✅ Archivo subido exitosamente: ${pendingFile.name}`);
                hasChanged = true;
                resolve();
              } else {
                console.error('❌ Error en carga de archivo:', xhr.response);
                reject(new Error(`Error HTTP: ${xhr.status} - ${xhr.statusText}`));
              }
            };
            
            xhr.onerror = () => reject(new Error('Error de red'));
            
            xhr.open('POST', API_BASE_URL, true);
            xhr.send(formData);
          });
        } catch (error) {
          success = false;
          throw error;
        }
      });
      
      // Procesar todas las cargas
      try {
        await Promise.all(uploadPromises);
      } catch (error) {
        console.error('❌ Error al subir archivos:', error);
        addNotification(`Error al subir archivos: ${error.message}`, 'error');
      }
      
      // Solo llamar a save_changes si hubo cambios exitosos
      if (hasChanged) {
        const saveUrl = `${API_BASE_URL}save_changes/`;
        console.log(`💾 Aplicando cambios en el sistema RAG: ${saveUrl}`);
        
        try {
          const saveResponse = await fetch(saveUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId
            })
          });
          
          if (!saveResponse.ok) {
            const errorText = await saveResponse.text().catch(() => 'Error desconocido');
            console.error('❌ Error en save_changes:', errorText);
            throw new Error(`Error al aplicar cambios en el sistema RAG: ${saveResponse.status} - ${errorText}`);
          } else {
            console.log('✅ Cambios aplicados correctamente en el sistema RAG');
          }
        } catch (error) {
          console.error('❌ Error en save_changes:', error);
          addNotification(`Error al finalizar cambios: ${error.message}`, 'error');
        }
      }
      
      // Limpiar estados si todo fue exitoso
      if (success) {
        setPendingFiles([]);
        setPendingDeletions([]);
        setUploadProgress({});
        
        // Esperar un momento para que el servidor procese
        console.log('⏳ Esperando procesamiento del servidor...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refrescar la lista de documentos
        console.log('🔄 Actualizando lista de documentos...');
        await fetchDocuments();
        
        addNotification('Cambios guardados exitosamente', 'success');
      }
    } catch (error) {
      console.error('❌ Error guardando cambios:', error);
      addNotification(`Error al guardar cambios: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Formato de tamaño en bytes a forma legible
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calcular el porcentaje de slots utilizados
  const remainingDocs = documents.filter(doc => !pendingDeletions.includes(doc.file_id));
  const usedSlots = remainingDocs.length + pendingFiles.length;
  const maxSlots = 5;
  const usedPercentage = (usedSlots / maxSlots) * 100;

  // Determinar clase de color para la barra de progreso
  const getProgressBarColor = () => {
    if (usedPercentage >= 80) return 'bg-red-500';
    if (usedPercentage >= 60) return 'bg-yellow-500';
    return 'bg-sky-500';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Base de Conocimiento</h1>
      <p className="text-gray-600 mb-6">
        Añade hasta 5 documentos PDF (máximo 1GB cada uno) para mejorar las respuestas y precisión del asistente virtual.
      </p>
      
      {/* Indicador de capacidad */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {usedSlots} de {maxSlots} documentos utilizados
          </span>
          <span className="text-sm text-gray-500">
            {usedPercentage.toFixed(0)}% de capacidad
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${getProgressBarColor()}`}
            style={{ width: `${usedPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Indicador de estado de sincronización */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500 flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
          {isLoading ? 'Cargando...' : 'Documentos cargados'}
        </div>
        
        <button
          onClick={refreshDocuments}
          disabled={isLoading || isSaving}
          className={`flex items-center text-sm px-3 py-1 rounded ${
            isLoading || isSaving 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors'
          }`}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader className="w-10 h-10 text-sky-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Mensaje de error si la API no está disponible */}
          {apiError && (
            <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="text-yellow-500 w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-yellow-800">Error de conexión</h3>
                  <p className="text-yellow-700 text-sm mb-2">
                    {apiError}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Notas informativas */}
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
            <Info className="text-blue-500 w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800">¿Cómo funciona?</h3>
              <p className="text-blue-700 text-sm">
                Los documentos subidos serán utilizados como fuente de información para que el asistente pueda proporcionar 
                respuestas más precisas y contextualizadas según tu contenido. Los cambios no se aplicarán hasta que presiones "Guardar cambios".
              </p>
            </div>
          </div>
          
          {/* Lista de documentos actuales */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Documentos ({usedSlots}/5)</h2>
            
            <div className="space-y-4">
              {documents.length === 0 && pendingFiles.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-1">No hay documentos</h3>
                  <p className="text-gray-500 mb-4">
                    Añade documentos para mejorar las respuestas del asistente.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {/* Documentos existentes */}
                  {documents
                    .filter(doc => !pendingDeletions.includes(doc.file_id))
                    .map(doc => (
                      <div 
                        key={doc.file_id} 
                        className="bg-white rounded-lg shadow p-4 flex items-center justify-between border border-gray-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center">
                          <div className="bg-sky-100 rounded-lg p-2 mr-4">
                            <FileText className="w-8 h-8 text-sky-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{doc.file_name}</h3>
                            <p className="text-sm text-gray-500">{formatFileSize(doc.size || 0)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => markForDeletion(doc.file_id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  
                  {/* Documentos marcados para eliminar */}
                  {documents
                    .filter(doc => pendingDeletions.includes(doc.file_id))
                    .map(doc => (
                      <div 
                        key={doc.file_id} 
                        className="bg-red-50 rounded-lg shadow p-4 flex items-center justify-between border border-red-100"
                      >
                        <div className="flex items-center">
                          <div className="bg-red-100 rounded-lg p-2 mr-4">
                            <FileText className="w-8 h-8 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800 line-through">{doc.file_name}</h3>
                            <p className="text-sm text-red-500">Marcado para eliminación</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => undoMarkForDeletion(doc.file_id)}
                          className="text-gray-400 hover:text-sky-500 transition-colors"
                          title="Restaurar documento"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  
                  {/* Archivos pendientes por subir */}
                  {pendingFiles.map(file => (
                    <div 
                      key={file.id} 
                      className="bg-sky-50 rounded-lg shadow p-4 flex items-center justify-between border border-sky-100"
                    >
                      <div className="flex items-center flex-grow">
                        <div className="bg-sky-100 rounded-lg p-2 mr-4">
                          <FileText className="w-8 h-8 text-sky-600" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-medium text-gray-800">{file.name}</h3>
                          <p className="text-sm text-sky-500">
                            {formatFileSize(file.size)} - Pendiente por subir
                          </p>
                          
                          {uploadProgress[file.id] > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                              <div 
                                className="h-1.5 rounded-full bg-sky-500"
                                style={{ width: `${uploadProgress[file.id]}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => removePendingFile(file.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-4"
                        title="Eliminar de la cola"
                        disabled={uploadProgress[file.id] > 0 && uploadProgress[file.id] < 100}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Sección para añadir archivos */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Añadir documentos</h2>
            
            {usedSlots >= maxSlots ? (
              <div className="bg-yellow-50 rounded-lg p-4 flex items-start border border-yellow-100 mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800">Límite alcanzado</h4>
                  <p className="text-yellow-700 text-sm">
                    Has alcanzado el límite de 5 documentos. Elimina alguno para añadir más.
                  </p>
                </div>
              </div>
            ) : (
              <div 
                ref={dropAreaRef}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-sky-500 bg-sky-50' 
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                } cursor-pointer mb-4`}
                onClick={() => fileInputRef.current.click()}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf"
                  multiple
                />
                <UploadCloud className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-sky-500' : 'text-gray-400'}`} />
                <p className={`text-lg font-medium mb-2 ${isDragging ? 'text-sky-700' : 'text-gray-700'}`}>
                  {isDragging ? 'Suelta para añadir' : 'Arrastra y suelta tus documentos aquí'}
                </p>
                <p className="text-gray-500 mb-1">
                  o haz clic para seleccionar archivos
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Solo archivos PDF (máximo 1GB cada uno)
                </p>
              </div>
            )}
          </div>
          
          {/* Botón para guardar cambios */}
          <div className="flex justify-end">
            <button 
              onClick={saveChanges}
              disabled={(!pendingFiles.length && !pendingDeletions.length) || isSaving}
              className={`flex items-center px-6 py-3 rounded-md font-medium ${
                (!pendingFiles.length && !pendingDeletions.length) || isSaving
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-white shadow-md hover:shadow-lg'
              } transition-all`}
            >
              {isSaving ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Guardando cambios...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Documents;