import { useState } from "react";
import api from "../api/api";
import { 
  TextField, 
  Button, 
  Box, 
  CircularProgress,
  Alert,
  Collapse,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";

export default function TaskForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Mixto");
  const [priority, setPriority] = useState("Media");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setLoading(true);
    setSuccessMessage("");

    try {
      const response = await api.post("/tasks/", {
        title: title.trim(),
        description: description.trim(),
        category,
        priority
      });

      setTitle("");
      setDescription("");
      setCategory("Mixto");
      setPriority("Media");
      
      setSuccessMessage(
        `✅ Tarea creada exitosamente (Código: ${response.data.code})`
      );
      
      onCreated(true, response.data);

      setTimeout(() => setSuccessMessage(""), 5000);

    } catch (err) {
      console.error("Task creation error:", err);

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
      <Collapse in={successMessage !== ""}>
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          icon={<span>🎉</span>}
        >
          {successMessage}
        </Alert>
      </Collapse>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            fullWidth
            required
            placeholder="Ej: Implementar login"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            fullWidth
            placeholder="Detalles opcionales..."
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={category}
              label="Categoría"
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="Frontend">Frontend</MenuItem>
              <MenuItem value="Backend">Backend</MenuItem>
              <MenuItem value="Full Stack">Full Stack</MenuItem>
              <MenuItem value="Product Owner">Product Owner</MenuItem>
              <MenuItem value="Scrum">Scrum</MenuItem>
              <MenuItem value="Mixto">Mixto</MenuItem>
              <MenuItem value="QA">QA</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Prioridad</InputLabel>
            <Select
              value={priority}
              label="Prioridad"
              onChange={(e) => setPriority(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="Alta">🔴 Alta</MenuItem>
              <MenuItem value="Media">🟡 Media</MenuItem>
              <MenuItem value="Baja">🟢 Baja</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            fullWidth
            sx={{ 
              height: "56px",
              background: "linear-gradient(45deg, #667eea 30%, #764ba2 90%)",
              "&:hover": {
                background: "linear-gradient(45deg, #5568d3 30%, #6a3f8f 90%)",
              }
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Crear Tarea"
            )}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}