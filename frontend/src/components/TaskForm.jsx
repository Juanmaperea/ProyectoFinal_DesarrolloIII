import { useState } from "react";
import api from "../api/api";
import { 
  TextField, 
  Button, 
  Box, 
  CircularProgress,
  Alert,
  Collapse 
} from "@mui/material";

export default function TaskForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setLoading(true);
    setSuccessMessage("");

    try {
      const response = await api.post("/tasks/", {
        title: title.trim(),
        description: description.trim()
      });

      // SAGA Exitoso
      setTitle("");
      setDescription("");
      setSuccessMessage("✅ Tarea creada exitosamente (SAGA completado)");
      
      // Notificar éxito al padre
      onCreated(true);

      // Auto-ocultar mensaje de éxito
      setTimeout(() => setSuccessMessage(""), 4000);

    } catch (err) {
      console.error("Task creation error:", err);

      // Detectar error de SAGA (rollback)
      if (err.response?.status === 503) {
        // Error 503 = Servicio de notificaciones no disponible
        const errorMessage = err.response?.data?.detail || 
          "El servicio de notificaciones no está disponible. La tarea no fue creada.";
        
        onCreated(false, errorMessage);
      } else {
        // Otros errores
        onCreated(false, "Error al crear la tarea. Por favor, intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box>
      {/* Success Message */}
      <Collapse in={successMessage !== ""}>
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      </Collapse>

      {/* Form */}
      <Box sx={{ 
        display: "flex", 
        gap: 2, 
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "stretch"
      }}>
        <TextField
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          fullWidth
          required
          placeholder="Ej: Comprar comida"
        />
        
        <TextField
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          fullWidth
          placeholder="Detalles opcionales..."
        />
        
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading || !title.trim()}
          sx={{ 
            minWidth: { xs: "100%", sm: "120px" },
            height: "56px"
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Crear"
          )}
        </Button>
      </Box>
    </Box>
  );
}