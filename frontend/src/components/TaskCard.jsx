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
  Tooltip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function TaskCard({ task, onUpdate }) {
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
        "&:hover": {
          boxShadow: 3,
          transform: "translateY(-2px)"
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h6" component="div">
                {task.title}
              </Typography>
              <Tooltip title="Tarea creada exitosamente (SAGA completado)">
                <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
              </Tooltip>
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
            disabled={deleting}
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
          
          <Typography variant="caption" color="text.secondary">
            Creada: {formatDate(task.created_at)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}