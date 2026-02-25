import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import AuthGuard from './AuthGuard';
import { isGovContext, isMompoxContext } from '../utils/roleUtils';


const RoleGuard = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);

  useEffect(() => {
    // Check if the user has selected a role
    const selectedRole = localStorage.getItem('naia_selected_role');
    
    if (selectedRole) {
      setHasRole(true);
    } else {
      // Detectar contexto para redirección correcta
      const isGov = isGovContext();
      const isMompox = isMompoxContext();
      if (isGov) {
        // En contexto gov, redirigir a /gov/naia
        navigate('/gov/naia');
      } else if (isMompox) {
        // En contexto mompox, redirigir a /mompox/naia
        navigate('/mompox/naia');
      } else {
        // En contexto normal, redirigir a /naia
        navigate('/naia');
      }

    }
    
    setLoading(false);
  }, [navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <Loader className="animate-spin text-blue-950 mb-4" size={32} />
          <p className="text-gray-700">Cargando NAIA...</p>
        </div>
      </div>
    );
  }

  if (!hasRole) {
    return null;
  }

  // 🚨 CLAVE: Verificar contexto de gobierno
  const isGov = isGovContext();
  const isMompox = isMompoxContext();
  
  if (isGov || isMompox) {
    // En contexto gov/mompox: NO usar AuthGuard, solo verificar rol
    console.log("🏛️ Contexto gov/mompox detectado - evitando AuthGuard");
    return children;
  } else {
    // En contexto normal: usar AuthGuard como siempre
    console.log("👤 Contexto normal - usando AuthGuard");
    return <AuthGuard>{children}</AuthGuard>;
  }

};

export default RoleGuard;