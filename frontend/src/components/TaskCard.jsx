import { useState } from "react";
import api from "../api/api";
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

export default function TaskCard({ task, onUpdate, isPending = false }) {
  const [deleting, setDeleting] = useState(false);

  const deleteTask = async () => {
    if (!window.confirm("¿Estás seguro de eliminar esta tarea?")) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/tasks/${task.id}`);
      onUpdate();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Error al eliminar la tarea");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 2,
        transition: "all 0.2s",
        opacity: isPending ? 0.7 : 1,
        "&:hover": {
          boxShadow: 3,
          transform: "translateY(-2px)"
        }
      }}
    >
      {/* Progress bar for pending tasks */}
      {isPending && (
        <LinearProgress 
          sx={{ 
            height: 3,
            backgroundColor: "#fff3e0",
            "& .MuiLinearProgress-bar": {
              backgroundColor: "#ff9800"
            }
          }} 
        />
      )}
      
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h6" component="div">
                {task.title}
              </Typography>
              
              {isPending ? (
                <Tooltip title="Procesando notificación vía RabbitMQ...">
                  <HourglassEmptyIcon sx={{ color: "warning.main", fontSize: 18 }} />
                </Tooltip>
              ) : (
                <Tooltip title="Tarea confirmada (SAGA completado vía RabbitMQ)">
                  <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
                </Tooltip>
              )}
            </Box>
            
            {task.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {task.description}
              </Typography>
            )}
          </Box>

          <IconButton 
            color="error" 
            onClick={deleteTask}
            disabled={deleting || isPending}
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Chip 
            label={task.status || "pending"}
            size="small"
            color={task.status === "completed" ? "success" : "default"}
            sx={{ textTransform: "capitalize" }}
          />
          
          {isPending && (
            <Chip 
              icon={<span>🐰</span>}
              label="Procesando en RabbitMQ"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontSize: "0.7rem" }}
            />
          )}
          
          {task.saga_id && (
            <Tooltip title={`SAGA ID: ${task.saga_id}`}>
              <Chip 
                label="SAGA"
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.7rem" }}
              />
            </Tooltip>
          )}
          
          <Typography variant="caption" color="text.secondary">
            Creada: {formatDate(task.created_at)}
          </Typography>
        </Box>

        {isPending && (
          <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid #e0e0e0" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <span>⏳</span>
              Esperando confirmación de notificación desde RabbitMQ...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}