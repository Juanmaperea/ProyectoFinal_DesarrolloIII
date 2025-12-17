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
  Chip,
  Paper
} from "@mui/material";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import SagaLogs from "../components/SagaLogs";
import RabbitMQMonitor from "../components/RabbitMQMonitor";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sagaError, setSagaError] = useState(null);
  const [showSagaLogs, setShowSagaLogs] = useState(false);
  const [pendingTasks, setPendingTasks] = useState(new Set());

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

  const handleTaskCreated = (success, taskData, message) => {
    if (success) {
      setSagaError(null);
      
      // Agregar tarea como "pendiente" (esperando confirmación asíncrona)
      if (taskData && taskData.id) {
        setPendingTasks(prev => new Set([...prev, taskData.id]));
        
        // Simular verificación después de 3 segundos
        setTimeout(async () => {
          await loadTasks();
          setPendingTasks(prev => {
            const updated = new Set(prev);
            updated.delete(taskData.id);
            return updated;
          });
        }, 3000);
      }
      
      loadTasks();
    } else {
      // Error en creación de tarea
      setSagaError({
        type: "error",
        message: message || "Error al crear la tarea"
      });
      
      setTimeout(() => setSagaError(null), 8000);
    }
  };

  // Polling para detectar rollbacks (opcional, para demo)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (pendingTasks.size > 0) {
        // Verificar si alguna tarea pendiente desapareció (rollback)
        try {
          const res = await api.get("/tasks/");
          const currentTasks = Array.isArray(res.data) ? res.data : res.data.tasks || [];
          const currentIds = new Set(currentTasks.map(t => t.id));
          
          pendingTasks.forEach(pendingId => {
            if (!currentIds.has(pendingId)) {
              // Tarea fue compensada (rollback)
              setSagaError({
                type: "rollback",
                message: "Una tarea fue compensada automáticamente por RabbitMQ debido a un fallo en la notificación."
              });
              setPendingTasks(prev => {
                const updated = new Set(prev);
                updated.delete(pendingId);
                return updated;
              });
            }
          });
        } catch (err) {
          console.error("Error checking pending tasks:", err);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pendingTasks]);

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header with RabbitMQ indicator */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h4">
            My Tasks
          </Typography>
          <Chip 
            icon={<span>🐰</span>}
            label="RabbitMQ Enabled" 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => setShowSagaLogs(!showSagaLogs)}
        >
          {showSagaLogs ? "Ocultar" : "Ver"} Logs SAGA
        </Button>
      </Box>

      {/* Info Box about RabbitMQ */}
      <RabbitMQMonitor />

      {/* SAGA Error/Rollback Alert */}
      <Collapse in={sagaError !== null}>
        <Alert 
          severity={sagaError?.type === "rollback" ? "warning" : "error"}
          sx={{ mb: 2 }}
          onClose={() => setSagaError(null)}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
            {sagaError?.type === "rollback" ? "🔄 Rollback Ejecutado (RabbitMQ)" : "❌ Error"}
          </Typography>
          <Typography variant="body2">
            {sagaError?.message}
          </Typography>
          {sagaError?.type === "rollback" && (
            <Typography variant="caption" sx={{ mt: 1, display: "block", opacity: 0.8 }}>
              El evento de fallo fue recibido desde RabbitMQ y la compensación se ejecutó automáticamente.
            </Typography>
          )}
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

      {/* Tasks List with pending indicator */}
      <Box sx={{ mt: 3 }}>
        {!loading && tasks.length > 0 && (
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
            </Typography>
            <Chip 
              label="✅ Confirmadas" 
              size="small" 
              color="success" 
              variant="outlined"
            />
            {pendingTasks.size > 0 && (
              <Chip 
                label={`⏳ ${pendingTasks.size} Procesando...`}
                size="small" 
                color="warning" 
                variant="outlined"
              />
            )}
          </Box>
        )}
        
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdate={loadTasks}
            isPending={pendingTasks.has(task.id)}
          />
        ))}
      </Box>
    </Container>
  );
}