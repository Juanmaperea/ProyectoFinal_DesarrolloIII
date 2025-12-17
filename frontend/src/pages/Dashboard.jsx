import { useEffect, useState } from "react";
import api from "../api/api";
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Alert,
  Button,
  Collapse,
  Chip
} from "@mui/material";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import SagaLogs from "../components/SagaLogs";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sagaError, setSagaError] = useState(null);
  const [showSagaLogs, setShowSagaLogs] = useState(false);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks/");

      const data = Array.isArray(res.data)
        ? res.data
        : res.data.tasks || [];

      setTasks(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (success, message) => {
    if (success) {
      setSagaError(null);
      loadTasks();
    } else {
      // Mostrar error de SAGA con rollback
      setSagaError({
        type: "rollback",
        message: message || "La tarea no pudo ser creada y se realizó un rollback automático"
      });
      
      // Auto-ocultar después de 8 segundos
      setTimeout(() => setSagaError(null), 8000);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">
          My Tasks
        </Typography>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => setShowSagaLogs(!showSagaLogs)}
        >
          {showSagaLogs ? "Ocultar" : "Ver"} Logs SAGA
        </Button>
      </Box>

      {/* SAGA Error/Rollback Alert */}
      <Collapse in={sagaError !== null}>
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          onClose={() => setSagaError(null)}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
            🔄 Rollback Ejecutado (Patrón SAGA)
          </Typography>
          <Typography variant="body2">
            {sagaError?.message}
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: "block", opacity: 0.8 }}>
            La tarea fue eliminada automáticamente porque el servicio de notificaciones no está disponible.
          </Typography>
        </Alert>
      </Collapse>

      {/* SAGA Logs Panel */}
      <Collapse in={showSagaLogs}>
        <SagaLogs />
      </Collapse>

      {/* Task Form */}
      <TaskForm onCreated={handleTaskCreated} />

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* General Error */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            No tienes tareas todavía
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Crea tu primera tarea usando el formulario de arriba
          </Typography>
        </Box>
      )}

      {/* Tasks List with SAGA indicator */}
      <Box sx={{ mt: 3 }}>
        {!loading && tasks.length > 0 && (
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
            </Typography>
            <Chip 
              label="✅ SAGA Completados" 
              size="small" 
              color="success" 
              variant="outlined"
            />
          </Box>
        )}
        
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdate={loadTasks}
          />
        ))}
      </Box>
    </Container>
  );
}