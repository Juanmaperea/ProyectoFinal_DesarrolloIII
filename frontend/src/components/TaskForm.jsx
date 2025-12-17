import { useState } from "react";
import api from "../api/api";
import { 
  TextField, 
  Button, 
  Box, 
  CircularProgress,
  Alert,
  Collapse,
  Chip
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

      // ✅ Tarea creada y evento publicado a RabbitMQ
      setTitle("");
      setDescription("");
      
      // Mensaje actualizado para reflejar comportamiento asíncrono
      setSuccessMessage(
        "✅ Tarea creada y enviada a RabbitMQ. " +
        "La notificación se procesará de forma asíncrona."
      );
      
      // Notificar éxito al padre
      onCreated(true, response.data);

      // Auto-ocultar mensaje de éxito
      setTimeout(() => setSuccessMessage(""), 5000);

    } catch (err) {
      console.error("Task creation error:", err);

      // El frontend ya NO recibe errores 503 inmediatamente
      // porque RabbitMQ garantiza la entrega
      const errorMessage = err.response?.data?.detail || 
        "Error al crear la tarea. Por favor, intenta de nuevo.";
      
      onCreated(false, null, errorMessage);
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
      {/* Success Message with RabbitMQ indicator */}
      <Collapse in={successMessage !== ""}>
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          icon={<span>🐰</span>}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            {successMessage}
            <Chip 
              label="RabbitMQ" 
              size="small" 
              color="success" 
              variant="outlined"
              sx={{ fontSize: "0.7rem", height: "20px" }}
            />
          </Box>
          <Box sx={{ fontSize: "0.85rem", opacity: 0.9, mt: 0.5 }}>
            💡 El evento fue publicado exitosamente. RabbitMQ garantiza que se procese aunque 
            el servicio de notificaciones esté temporalmente no disponible.
          </Box>
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