import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';

const RoleGuard = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);

  useEffect(() => {
    // Check if the user has selected a role
    const selectedRole = localStorage.getItem('naia_selected_role');
    console.log("Rol seleccionado encontrado:", selectedRole);
    if (selectedRole) {
      setHasRole(true);
    } else {
      // Redirect to role selection if no role is selected
      navigate('/naia');
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

  return hasRole ? children : null;
};

export default RoleGuard;